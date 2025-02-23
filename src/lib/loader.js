import * as nifti from 'nifti-reader-js'
import * as hdf5 from './hdf5.js'
import * as cdf from './cdf.js'

function img2nii(root, image, isVerbose = false) {
  /* The rest of this code is MINC-specific, so like some of the
   * functions above, it can migrate into minc.js once things have
   * stabilized.
   *
   * This code is responsible for collecting up the various pieces
   * of important data and metadata, and reorganizing them into the
   * form the volume viewer can handle.
   */
  var image = hdf5.findDataset(root, 'image')
  if (!image) {
    throw new Error("Can't find image dataset.")
  }
  var valid_range = hdf5.findAttribute(image, 'valid_range', 0)
  /* If no valid_range is found, we substitute our own. */
  if (!valid_range) {
    var min_val
    var max_val
    switch (image.type) {
      case type_enum.INT8:
        min_val = -(1 << 7)
        max_val = (1 << 7) - 1
        break
      case type_enum.UINT8:
        min_val = 0
        max_val = (1 << 8) - 1
        break
      case type_enum.INT16:
        min_val = -(1 << 15)
        max_val = (1 << 15) - 1
        break
      case type_enum.UINT16:
        min_val = 0
        max_val = (1 << 16) - 1
        break
      case type_enum.INT32:
        min_val = -(1 << 31)
        max_val = (1 << 31) - 1
        break
      case type_enum.UINT32:
        min_val = 0
        max_val = (1 << 32) - 1
        break
    }
    valid_range = Float32Array.of(min_val, max_val)
  }
  var image_min = hdf5.findDataset(root, 'image-min')
  if (!image_min || !image_min.array) {
    image_min = {
      array: Float32Array.of(0),
      dims: []
    }
  }
  var image_max = hdf5.findDataset(root, 'image-max')
  if (!image_max || !image_max.array) {
    image_max = {
      array: Float32Array.of(1),
      dims: []
    }
  }
  /* Create the header expected by the existing brainbrowser code.
   */
  var header = {}
  var tmp = hdf5.findAttribute(image, 'dimorder', 0)
  if (typeof tmp !== 'string') {
    throw new Error("Can't find dimension order.")
  }
  header.order = tmp.split(',')
  header.order.forEach(function (dimname) {
    var dim = hdf5.findDataset(root, dimname)
    if (!dim) {
      throw new Error("Can't find dimension variable " + dimname)
    }
    header[dimname] = {}
    const spacing = hdf5.findAttribute(dim, 'spacing', 'regular__')
    if (spacing === 'irregular') {
      throw new Error('Irregular spacing not supported.')
    } else if (spacing !== 'regular__') {
      console.warn(`Invalid spacing declaration: ${spacing}; assuming regular`)
    }
    tmp = hdf5.findAttribute(dim, 'step', 0)
    if (!tmp) {
      tmp = Float32Array.of(1)
    }
    header[dimname].step = tmp[0]

    tmp = hdf5.findAttribute(dim, 'start', 0)
    if (!tmp) {
      tmp = Float32Array.of(0)
    }
    header[dimname].start = tmp[0]

    tmp = hdf5.findAttribute(dim, 'length', 0)
    if (!tmp) {
      throw new Error("Can't find length for " + dimname)
    }
    header[dimname].space_length = tmp[0]
    tmp = hdf5.findAttribute(dim, 'direction_cosines', 0)
    if (tmp) {
      // why is the bizarre call to slice needed?? it seems to work, though!
      header[dimname].direction_cosines = Array.prototype.slice.call(tmp)
    } else {
      if (dimname === 'xspace') {
        header[dimname].direction_cosines = [1, 0, 0]
      } else if (dimname === 'yspace') {
        header[dimname].direction_cosines = [0, 1, 0]
      } else if (dimname === 'zspace') {
        header[dimname].direction_cosines = [0, 0, 1]
      }
    }
  })
  var new_abuf
  if (hdf5.isRgbVolume(header, image)) {
    header.order.pop()
    new_abuf = new Uint8Array(hdf5.rgbVoxels(image))
  } else if (image_min.array.length === 1) {
    new_abuf = image.array
  } else {
    new_abuf = new Float32Array(hdf5.scaleVoxels(image, image_min, image_max, valid_range, isVerbose))
  }
  return [header, new_abuf]
}

function getAffine(spaces) {
  // This is a direct translation of the nibabel Python code, and retains the MIT license
  // https://github.com/nipy/nibabel/blob/84294f4e05e0f10f9cc64d3474f94ad3e243f682/nibabel/minc1.py#L94
  // Filter only spatial dimensions (names ending with 'space')
  const spatial = spaces.filter((item) => item.name.endsWith('space'))
  const nspatial = spatial.length
  if (nspatial !== 3) {
    throw new Error('This MINC file does not have 3 spatial dimensions.')
  }
  // Create an identity matrix for the rotation matrix (nspatial x nspatial)
  let rotMat = Array(nspatial)
    .fill(null)
    .map((_, i) => {
      let row = Array(nspatial).fill(0)
      row[i] = 1
      return row
    })
  // Initialize arrays for steps and starts with default values
  let steps = new Array(nspatial).fill(0)
  let starts = new Array(nspatial).fill(0)
  // Fill in the rotation matrix columns and record steps and starts.
  for (let i = 0; i < nspatial; i++) {
    const dim = spatial[i]
    // Use provided direction_cosines or a default if needed.
    const dcos = dim.direction_cosines || /* default_dir_cos[dim.name] */ [0, 0, 0]
    // Replace column i in rotMat with the direction cosines:
    for (let j = 0; j < nspatial; j++) {
      rotMat[j][i] = dcos[j]
    }
    // Use provided step and start values or defaults (1.0 and 0.0, respectively)
    steps[i] = typeof dim.step !== 'undefined' ? dim.step : 1.0
    starts[i] = typeof dim.start !== 'undefined' ? dim.start : 0.0
  }
  // Compute the origin: a dot product of rotMat and starts vector.
  // For each row in rotMat, sum( rotMat[i][j] * starts[j] ) gives origin[i]
  let origin = new Array(nspatial).fill(0)
  for (let i = 0; i < nspatial; i++) {
    let sum = 0
    for (let j = 0; j < nspatial; j++) {
      sum += rotMat[i][j] * starts[j]
    }
    origin[i] = sum
  }
  // Build the affine matrix as an identity matrix of size (nspatial+1) x (nspatial+1)
  let aff = Array(nspatial + 1)
    .fill(null)
    .map((_, i) => {
      let row = Array(nspatial + 1).fill(0)
      row[i] = 1
      return row
    })
  // Multiply each column of rotMat by the corresponding step value and insert into aff.
  for (let i = 0; i < nspatial; i++) {
    for (let j = 0; j < nspatial; j++) {
      aff[j][i] = rotMat[j][i] * steps[i]
    }
  }
  // Place the origin in the last column (excluding the bottom-right element)
  for (let i = 0; i < nspatial; i++) {
    aff[i][nspatial] = origin[i]
  }
  return aff
}

export async function mnc2nii(inBuffer, isVerbose = false) {
  //try {
  let arrayBuff = extractArrayBuffer(inBuffer)
  const dataView = new DataView(arrayBuff)
  const signature = dataView.getUint32(0, false) // false for big-endian
  let root = []
  if (signature === 0x89484446) {
    root = await hdf5.hdf5Reader(arrayBuff, isVerbose)
  } else if (signature === 0x43444601) {
    root = cdf.netcdfReader(arrayBuff, isVerbose)
  } else {
    throw new Error('Not a valid MINC format file (signature is not HDF or CDF).')
  }
  var image = hdf5.findDataset(root, 'image')
  if (!image) {
    throw new Error("Can't find image dataset.")
  }
  let [header_text, img] = img2nii(root, image)
  // n.b. NIFTI dimension order: first dimensions change fastest on disk, MINC is reverse
  let spaces = header_text.order
    .slice()
    .reverse()
    .map((key) => ({ name: key, ...header_text[key] }))
  const hdr = new nifti.NIFTI1()
  hdr.affine = getAffine(spaces)
  hdr.littleEndian = true
  hdr.dims = [0, 0, 0, 0, 0, 0, 0, 0] // Default row/column/slice/volume dimensions
  hdr.dims[0] = spaces.length
  for (let i = 0; i < spaces.length; i++) {
    hdr.dims[i + 1] = spaces[i].space_length
  }
  if (img instanceof Int8Array) {
    hdr.datatypeCode = 256 // DT_INT8
    hdr.numBitsPerVoxel = 8
  } else if (img instanceof Uint8Array) {
    hdr.datatypeCode = 2 // DT_UINT8
    hdr.numBitsPerVoxel = 8
  } else if (img instanceof Int16Array) {
    hdr.datatypeCode = 4 // DT_INT16
    hdr.numBitsPerVoxel = 16
  } else if (img instanceof Uint16Array) {
    hdr.datatypeCode = 512 // DT_UINT16
    hdr.numBitsPerVoxel = 16
  } else if (img instanceof Float32Array) {
    hdr.datatypeCode = 16 // DT_FLOAT32
    hdr.numBitsPerVoxel = 32
  } else {
    throw new Error('Unknown datatype: ' + img.constructor.name)
  }
  hdr.pixDims = [0, 1, 1, 1, 1, 0, 0, 0] // Default voxel size
  for (let i = 0; i < spaces.length; i++) {
    hdr.pixDims[i + 1] = Math.abs(spaces[i].step)
  }
  hdr.vox_offset = 352 // Standard offset
  hdr.scl_slope = 1
  hdr.scl_inter = 0
  hdr.qform_code = 0
  hdr.sform_code = 1 // NIFTI_XFORM_SCANNER_ANAT
  hdr.littleEndian = true
  hdr.magic = 'n+1'
  //const nvol = Math.max(1, hdr.dims[4])
  const bytesPerVoxel = Math.floor(hdr.numBitsPerVoxel / 8)
  //const nbytes = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * .. * bytesPerVoxel
  // Calculate the number of bytes based on all dimensions
  const nbytes = hdr.dims.slice(1, hdr.dims[0] + 1).reduce((acc, dim) => acc * dim, bytesPerVoxel)
  if (img.byteLength !== nbytes) {
    let dimString = Array.from({ length: hdr.dims[0] }, (_, i) => hdr.dims[i + 1]).join('×')
    throw new Error(`Expected ${nbytes} bytes which is correct ${img.byteLength} bytes: ${dimString}:${bytesPerVoxel}`)
  }
  const hdrBuffer = hdr.toArrayBuffer()
  // Merge header and voxel data
  const niftiData = new Uint8Array(hdrBuffer.byteLength + img.byteLength)
  niftiData.set(new Uint8Array(hdrBuffer), 0)
  niftiData.set(new Uint8Array(img.buffer, img.byteOffset, img.byteLength), hdrBuffer.byteLength)
  return niftiData
  /*} catch (error) {
    console.error('Error reading MINC file:', error.message)
  }*/
}

export function extractArrayBuffer(inBuffer) {
  if (inBuffer instanceof ArrayBuffer) {
    return inBuffer
  }
  if (inBuffer instanceof Uint8Array) {
    return inBuffer.buffer.slice(inBuffer.byteOffset, inBuffer.byteOffset + inBuffer.byteLength)
  }
  if (typeof inBuffer === 'string') {
    return new TextEncoder().encode(inBuffer).buffer
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(inBuffer)) {
    return inBuffer.buffer.slice(inBuffer.byteOffset, inBuffer.byteOffset + inBuffer.byteLength)
  }
  throw new Error('Unsupported input type: Expected Uint8Array, ArrayBuffer, Buffer, or string.')
}

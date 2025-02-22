import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { mnc2nii } from '../src/lib/loader.js'
import * as nifti from 'nifti-reader-js'

// Define test cases for each file
const testCases = [
  {
    file: 'ax2.mnc',
    note: 'two axial HDF5 MINC2',
    dims: [64, 64, 35, 2],
    datatypeCode: 16
  },
  {
    file: 'corM1.mnc',
    note: 'one coronal netcdf MINC1',
    dims: [64, 64, 35, 0],
    datatypeCode: 16
  },
  {
    file: 'sag.mnc',
    note: 'one sagittal HDF5 MINC2',
    dims: [64, 64, 35, 0],
    datatypeCode: 16
  },
  {
    file: 'RAS.mnc',
    note: 'one axial HDF5 MINC2',
    dims: [64, 79, 67, 0],
    datatypeCode: 2
  }
]

describe('MINC Conversion Tests', () => {
  testCases.forEach(({ file, dims, datatypeCode }) => {
    it(`should convert ${file} and test properties`, async () => {
      const filePath = join(__dirname, 'testData', file)
      const fileBuffer = await fs.readFile(filePath)
      const niidata = await mnc2nii(fileBuffer)
      const hdr = nifti.readHeader(niidata.buffer)
      console.log(file, hdr.dims[1], hdr.dims[2], hdr.dims[3], hdr.datatypeCode)
      expect(hdr.dims[1]).toEqual(dims[0])
      expect(hdr.dims[2]).toEqual(dims[1])
      expect(hdr.dims[3]).toEqual(dims[2])
      expect(hdr.dims[4]).toEqual(dims[3])
      expect(hdr.datatypeCode).toEqual(datatypeCode)
      const niftiImageData = nifti.readImage(hdr, niidata)
    })
  })
})

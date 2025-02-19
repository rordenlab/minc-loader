import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { mnc2nii } from '../src/lib/loader.js'
import * as nifti from 'nifti-reader-js'

describe('MINC Conversion Tests', () => {
  it('should convert MINC voxel-based image to a NIfTI and test properties', async () => {
    const voxFilePath = join(__dirname, 'testData', 'ax.mnc')
    const fileBuffer = await fs.readFile(voxFilePath)
    const niidata = await mnc2nii(fileBuffer)
    const hdr = nifti.readHeader(niidata.buffer)
    expect(hdr.dims[1]).toEqual(64)
    expect(hdr.dims[2]).toEqual(64)
    expect(hdr.dims[3]).toEqual(35)
    expect(hdr.datatypeCode).toEqual(4)
    const niftiImageData = nifti.readImage(hdr, niidata)
  })
})

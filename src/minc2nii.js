#!/usr/bin/env node

import * as fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { mnc2nii } from './lib/loader.js'
import { performance } from 'perf_hooks'

// Convert `import.meta.url` to __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check command-line arguments
if (process.argv.length < 3) {
  console.error('Usage: node vox2nii.js <input.vox>')
  process.exit(1)
}

const inputFile = process.argv[2]
const outputFile = inputFile.replace(/\.mnc$/, '.nii')

// Read and parse the `.vox` file
async function convertVoxToNifti() {
  const startTime = performance.now()
  const buffer = await fs.readFile(inputFile)
  let niftiData = await mnc2nii(buffer)
  // Save the NIfTI file
  await fs.writeFile(outputFile, Buffer.from(niftiData.buffer))
  console.log(`Converted to ${outputFile} in ${Math.round(performance.now() - startTime)}ms`)
}

convertVoxToNifti()

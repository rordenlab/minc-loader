import { Niivue } from '@niivue/niivue'
import { mnc2nii } from './lib/loader'

export async function setupNiivue(element) {
  const nv = new Niivue()
  nv.attachToCanvas(element)
  // supply loader function, fromExt, and toExt (without dots)
  nv.useLoader(mnc2nii, 'mnc', 'nii')
  await nv.loadImages([
    {
      url: '/ax.mnc'
    }
  ])
}

# minc-loader

The minc-loader is a NiiVue plugin that converts [MINC format](https://en.wikibooks.org/wiki/MINC/SoftwareDevelopment/MINC2.0_File_Format_Reference) .mnc volumes into NIfTI volumes. It adapts code from [brainbrowser](https://github.com/aces/brainbrowser) library to read .mnc files (stored in both the older NetCDF and the more recent HDF5 structures). 

![Example voxel-based monument](monument.jpg)

## Local Development

To illustrate this library, `vox2nii` is a node.js converter that can be run from the command line:

```
git clone git@github.com:rordenlab/minc-loader.git
cd minc-loader
npm install
node ./src/minc2nii.js ./tests/testData/ax.mnc
```

## Local Browser Development

You can also embed this loader into a hot-reloadable NiiVue web page to evaluate integration:

```
git clone git@github.com:rordenlab/minc-loader.git
cd minc-loader
npm install
npm run dev
```

## Creating Sample Datasets

You can convert NIfTI images with [nii2mnc](https://bic-mni.github.io/man-pages/man/nii2mnc.html), e.g. `nii2mnc ax_asc_35sl_6.nii ax.mnc`. This creates MINC files using HDF5 structure. To convert these files to NetCDF use [mincconvert](https://bic-mni.github.io/man-pages/man/mincconvert.html). The nice thing about converting known NIfTI files, is that you know the correct conversion to MINC. In particular, MINC files use different spatial transforms than NIfTI, so you may want to check how [mnc2nii](https://github.com/BIC-MNI/minc-tools/blob/e3825986359ecd75d82aa88ff2015d36e234e55d/conversion/nifti1/mnc2nii.c#L617) converts from MINC transforms to the [NIfTI sform](https://brainder.org/2012/09/23/the-nifti-file-format/).


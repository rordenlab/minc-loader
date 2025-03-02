# minc-loader

The minc-loader is a NiiVue plugin that converts [MINC format](https://en.wikibooks.org/wiki/MINC/SoftwareDevelopment/MINC2.0_File_Format_Reference) .mnc volumes into NIfTI volumes. It adapts code from [brainbrowser](https://github.com/aces/brainbrowser) library to read .mnc files (stored in both the older NetCDF and the more recent HDF5 structures). 

## Local Development

To illustrate this library, `minc2nii.js` is a node.js converter that can be run from the command line. The command `npm run test` runs some regression tests. The command `npm run cli` converts a MINC file to NIfTI from the command line. Finally, the command `node ./src/minc2nii.js /path/to/minc/minc.mnc` allows you to specify specific files to convert.

```
git clone git@github.com:rordenlab/minc-loader.git
cd minc-loader
npm install
npm run test
npm run cli
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

## Links

 - [mnc2nii.py](https://github.com/neurolabusc/mnc2nii.py) provides a Python nibabel conversion script and sample images.
 - [brainbrowser](https://github.com/aces/brainbrowser) code for hdf5 and netcdf reading is used here.
 - [nii2mnc](https://bic-mni.github.io/man-pages/man/nii2mnc.html) command line tool to convert NIfTI images to MINC (e.g. `Original`->`In`)
 - [mnc2nii](https://bic-mni.github.io/man-pages/man/mnc2nii.html) reference command line tool to convert MINC images to NIfTI (e.g. `In`->`Ref`)
 - [mincconvert](https://bic-mni.github.io/man-pages/man/mincconvert.html) command line tool for converting between MINC1 (netcdf) and MINC2 (HDF5) formats.
 - [minc2.py](https://github.com/nipy/nibabel/blob/84294f4e05e0f10f9cc64d3474f94ad3e243f682/nibabel/minc2.py#L144) nibabel Python class for reading MINC2 (HDF5) images.
 - [minc1.py](https://github.com/nipy/nibabel/blob/84294f4e05e0f10f9cc64d3474f94ad3e243f682/nibabel/minc1.py) nibabel Python class for reading MINC1 (netcdf) images.
 - [minc_to_nifti.py](https://gist.github.com/ofgulban/46d5c51ea010611cbb53123bb5906ca9) is a minimal nibabel wrapper for converting MINC images to NIfTI, but unlike `mnc2nii.py` it does not preserve details such as the spatial transfomation affine matrix.




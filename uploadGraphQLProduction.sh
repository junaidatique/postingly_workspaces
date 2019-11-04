echo "Uploading";
cd 'packages/graqphql'
pwd
NODE_ENV=production sls deploy --aws-profile postingly-production -s production --force

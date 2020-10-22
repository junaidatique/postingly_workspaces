echo "Uploading";
cd 'packages/functions'
pwd
NODE_ENV=production sls deploy --aws-profile postingly-deployment -s production --force

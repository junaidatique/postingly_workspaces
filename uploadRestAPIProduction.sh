echo "Uploading";
cd 'packages/rest_api'
pwd
NODE_ENV=production sls deploy --aws-profile postingly-deployment -s production --force

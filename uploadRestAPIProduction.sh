echo "Uploading";
cd 'packages/rest_api'
pwd
NODE_ENV=production sls deploy --aws-profile postingly-production -s production --force

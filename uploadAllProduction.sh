echo "Uploading";
cd 'packages/functions'
pwd
NODE_ENV=production sls prune -n 5 --aws-profile postingly-production -s production --force
NODE_ENV=production sls deploy --aws-profile postingly-production -s production --force
cd ../..
cd 'packages/rest_api'
pwd
NODE_ENV=production sls prune -n 5 --aws-profile postingly-production -s production --force
NODE_ENV=production sls deploy --aws-profile postingly-production -s production --force
cd ../..
cd 'packages/graqphql'
pwd
NODE_ENV=production sls prune -n 5 --aws-profile postingly-production -s production --force
NODE_ENV=production sls deploy --aws-profile postingly-production -s production --force

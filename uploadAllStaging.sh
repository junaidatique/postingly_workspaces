echo "Uploading";
cd 'packages/functions'
pwd
NODE_ENV=staging sls prune -n 5 --aws-profile postingly-staging -s staging --force
NODE_ENV=staging sls deploy --aws-profile postingly-staging -s staging --force
cd ../..
cd 'packages/rest_api'
pwd
NODE_ENV=staging sls prune -n 5 --aws-profile postingly-staging -s staging --force
NODE_ENV=staging sls deploy --aws-profile postingly-staging -s staging --force
cd ../..
cd 'packages/graqphql'
pwd
NODE_ENV=staging sls prune -n 5 --aws-profile postingly-staging -s staging --force
NODE_ENV=staging sls deploy --aws-profile postingly-staging -s staging --force

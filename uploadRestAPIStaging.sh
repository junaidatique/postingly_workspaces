echo "Uploading Fns";
cd 'packages/rest_api'
pwd
NODE_ENV=staging sls deploy --aws-profile postingly-deployment -s staging --force

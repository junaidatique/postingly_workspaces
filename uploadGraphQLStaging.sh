echo "Uploading";
cd 'packages/graqphql'
pwd
NODE_ENV=staging sls deploy --aws-profile postingly-deployment -s staging --force

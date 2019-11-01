echo "Uploading Fns";
cd 'packages/functions'
pwd
NODE_ENV=staging sls deploy --aws-profile postingly-staging -s staging --force

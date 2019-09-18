echo "Uploading";
cd 'packages/functions'
pwd
NODE_ENV=$1 sls deploy --aws-profile postingly-$1 -s $1
cd ../..
cd 'packages/rest_api'
pwd
NODE_ENV=$1 sls deploy --aws-profile postingly-$1 -s $1
cd ../..
cd 'packages/graqphql'
pwd
NODE_ENV=$1 sls deploy --aws-profile postingly-$1 -s $1

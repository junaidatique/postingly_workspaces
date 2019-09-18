echo "Uploading Fns";
cd 'packages/functions'
pwd
NODE_ENV=$1 sls deploy --aws-profile postingly-$1 -s $1

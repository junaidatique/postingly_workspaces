// const AWS = require("aws-sdk");;

// const IS_OFFLINE = process.env.IS_OFFLINE;

// let dynamoDb;
// if (IS_OFFLINE === 'true') {
//   dynamoDb = new AWS.DynamoDB.DocumentClient({
//     region: 'localhost',
//     endpoint: 'http://localhost:8000'
//   })
// } else {
//   dynamoDb = new AWS.DynamoDB.DocumentClient();
// };
// module.exports = dynamoDb;
const dynamoose = require('dynamoose');

const IS_OFFLINE = process.env.IS_OFFLINE;

if (IS_OFFLINE === 'true' || process.env.NODE_ENV === 'test') {
  dynamoose.local();
} else {
  dynamoose.AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
}
dynamoose.setDefaults({
  create: true,
  prefix: `${process.env.APP_NAME}-`,
  suffix: `-${process.env.STAGE}`
});
module.exports = dynamoose;

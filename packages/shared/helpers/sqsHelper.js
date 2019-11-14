let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
module.exports = {
  addToQueue: async function (queueName, payload) {
    const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}${queueName}`;
    console.log(`TCL: ${queueName} QueueUrl`, QueueUrl)
    const params = {
      MessageBody: JSON.stringify(payload),
      QueueUrl: QueueUrl
    };
    console.log(`TCL: ${queueName} params`, params)
    const response = await sqs.sendMessage(params).promise();
    console.log(`TCL: ${queueName} response`, response)
  }
}
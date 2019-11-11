const shared = require('shared');
const _ = require('lodash');
const { APPROVED } = require('shared/constants');

const dbConnection = require('./db');
let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  // Create an SQS service object
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
module.exports = {
  share: async function (event, context) {
    await dbConnection.createConnection(context);
    try {
      const UpdateModel = shared.UpdateModel;
      const dateTime = shared.dateTime;
      let updates;
      const next_five_minutes = dateTime.getRoundedDate(5);
      console.log("TCL: next_five_minutes", next_five_minutes)
      if (process.env.IS_OFFLINE === 'false') {
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $lte: next_five_minutes } });
      } else {
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } }).limit(1);
      }
      // console.log("TCL: updates", updates)
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(updates.map(async update => {
          const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}ShareUpdates`;
          console.log("TCL: QueueUrl", QueueUrl)
          const params = {
            MessageBody: JSON.stringify({ updateId: update._id }),
            QueueUrl: QueueUrl
          };
          console.log("TCL: params", params)
          const response = await sqs.sendMessage(params).promise();
          console.log("TCL: response", response)
        }));
      } else {
        console.log("TCL: cronPostUpdates.share event", event);
      }
    } catch (error) {
      console.error(error.message);
    }
  },

}
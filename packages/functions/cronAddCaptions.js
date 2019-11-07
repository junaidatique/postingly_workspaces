const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');

const dbConnection = require('./db');
let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
module.exports = {
  execute: async function (event, context) {
    await dbConnection.createConnection(context);
    let storeId = null;
    try {
      const UpdateModel = shared.UpdateModel;
      const services = await UpdateModel.distinct('service',
        {
          scheduleState: PENDING,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          rule: { $exists: true },
          autoApproveUpdates: { $ne: false },
          autoAddCaptionOfUpdates: { $ne: false },
          userEdited: false,
          captionsUpdated: false,
        }
      );
      console.log("TCL: services", services)
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(services.map(async service => {
          if (!_.isEmpty(event) && !_.isUndefined(event) && !_.isNull(event.storeId)) {
            storeId = event.storeId;
          }
          const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}_changeCaption`;
          console.log("TCL: QueueUrl", QueueUrl)
          const params = {
            MessageBody: JSON.stringify({ service: service, storeId: storeId }),
            QueueUrl: QueueUrl
          };
          console.log("TCL: params", params)
          const response = await sqs.sendMessage(params).promise();
          console.log("TCL: response", response)
        }));
      } else {
        console.log("TCL: cronAddCaptions event", event)

      }
    } catch (error) {
      console.error(error.message);
    }
  },

}
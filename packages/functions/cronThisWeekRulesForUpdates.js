const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED, RULE_TYPE_OLD } = require('shared/constants');
// const scheduleProducts = require('functions').scheduleProducts.schedule;
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
  excute: async function (event, context) {
    await dbConnection.createConnection(context);
    try {
      const UpdateModel = shared.UpdateModel;
      const rules = await UpdateModel.distinct('rule',
        {
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          rule: { $exists: true },
          type: RULE_TYPE_OLD
        }
      );
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(rules.map(async rule => {
          const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}_scheduleUpdates`;
          console.log("TCL: QueueUrl", QueueUrl)
          const params = {
            MessageBody: JSON.stringify({ ruleId: rule }),
            QueueUrl: QueueUrl
          };
          console.log("TCL: params", params)
          const response = await sqs.sendMessage(params).promise();
          console.log("TCL: response", response)
        }));
      } else {
        console.log("TCL: cronThisWeekRulesForUpdates event", event)
      }
    } catch (error) {
      console.error(error.message);
    }
  },
}
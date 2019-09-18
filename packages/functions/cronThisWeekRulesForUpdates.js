const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED } = require('shared/constants');
// const scheduleProducts = require('functions').scheduleProducts.schedule;
const dbConnection = require('./db');
let lambda;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
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
          rule: { $exists: true }
        }
      );
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(rules.map(async rule => {
          const params = {
            FunctionName: `postingly-functions-${process.env.STAGE}-schedule-updates`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ ruleId: rule })
          };
          console.log("TCL: lambda.invoke params", params)
          console.log("TCL: lambda", lambda)
          const lambdaResponse = await lambda.invoke(params).promise();
          console.log("TCL: lambdaResponse", lambdaResponse)
        }));
      } else {
        console.log("TCL: cronThisWeekRulesForUpdates event", event)
      }
    } catch (error) {
      console.error(error.message);
    }
  },
}
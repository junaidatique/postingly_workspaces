const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');

const dbConnection = require('./db');
let lambda;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
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
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(services.map(async service => {
          if (!_.isEmpty(event) && !_.isUndefined(event) && !_.isNull(event.storeId)) {
            storeId = event.storeId;
          }
          const params = {
            FunctionName: `postingly-functions-${process.env.STAGE}-change-caption`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ service: service, storeId: storeId })
          };
          console.log("TCL: lambda.invoke params", params)
          const lambdaResponse = await lambda.invoke(params).promise();
          console.log("TCL: lambdaResponse", lambdaResponse)
          // await changeCaption.update();
        }));
      } else {
        console.log("TCL: cronAddCaptions event", event)

      }
    } catch (error) {
      console.error(error.message);
    }
  },
  getRoundedDate: function (minutes, d = new Date()) {
    let ms = 1000 * 60 * minutes; // convert minutes to ms
    let roundedDate = new Date(Math.round(d.getTime() / ms) * ms);
    return roundedDate
  }
}
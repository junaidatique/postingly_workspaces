const shared = require('shared');
const _ = require('lodash');
const { APPROVED, FACEBOOK_SERVICE } = require('shared/constants');

const dbConnection = require('./db');

module.exports = {
  share: async function (event, context) {
    await dbConnection.createConnection(context);
    try {
      const UpdateModel = shared.UpdateModel;
      let updates;
      if (process.env.IS_OFFLINE === 'false') {
        const next_five_minutes = getRoundedDate(5);
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $lt: next_five_minutes } });
      } else {
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } }).limit(1);
      }
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(updates.map(async update => {
          const params = {
            FunctionName: `postingly-functions-${process.env.STAGE}-share-updates`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ updateId: update._id })
          };
          console.log("TCL: lambda.invoke params", params)
          console.log("TCL: lambda", lambda)
          const lambdaResponse = await lambda.invoke(params).promise();
          console.log("TCL: lambdaResponse", lambdaResponse)
        }));
      } else {
        console.log("TCL: cronPostUpdates.share event", event);
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
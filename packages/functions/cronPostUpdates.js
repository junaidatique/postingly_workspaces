const shared = require('shared');
const _ = require('lodash');
const { APPROVED, FACEBOOK_SERVICE } = require('shared/constants');
let shareUpdates;
if (process.env.IS_OFFLINE) {
  shareUpdates = require('functions/shareUpdates');
}

const mongoose = require('mongoose');
let conn = null;

module.exports = {
  share: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    try {
      const UpdateModel = shared.UpdateModel;
      let updates;
      if (process.env.IS_OFFLINE) {
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } }).limit(1);
      } else {
        const next_five_minutes = getRoundedDate(5);
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $lt: next_five_minutes } });
      }
      await Promise.all(updates.map(async update => {
        if (process.env.IS_OFFLINE) {
          await shareUpdates.share({ updateId: update._id });
        } else {
          // var params = {
          //   FunctionName: 'Lambda_B', // the lambda function we are going to invoke
          //   InvocationType: 'RequestResponse',
          //   LogType: 'Tail',
          //   Payload: '{ "name" : "Alex" }'
          // };

          // lambda.invoke(params, function (err, data) {
          //   if (err) {
          //     context.fail(err);
          //   } else {
          //     context.succeed('Lambda_B said ' + data.Payload);
          //   }
          // })
        }
      }));
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
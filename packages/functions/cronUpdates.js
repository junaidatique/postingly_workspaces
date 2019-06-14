const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { APPROVED, FACEBOOK_SERVICE } = require('shared/constants');
let facebookUpdates;
if (process.env.IS_OFFLINE) {
  facebookUpdates = require('functions/facebookUpdates');
}

module.exports = {
  share: async function (event, context) {
    try {
      const UpdateModel = shared.UpdateModel;
      let updates;
      if (process.env.IS_OFFLINE) {
        updates = await UpdateModel.where('scheduleState').equals(APPROVED);
      } else {
        const next_five_minutes = getRoundedDate(5);
        updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $lt: next_five_minutes } });
      }
      await Promise.all(updates.map(async update => {
        if (process.env.IS_OFFLINE) {
          if (update.service === FACEBOOK_SERVICE) {
            await facebookUpdates.share({ updateId: update._id });
          }
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
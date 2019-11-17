const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const { APPROVED } = require('shared/constants');

const dbConnection = require('./db');

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
      console.log("TCL: updates.length", updates.length)
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(updates.map(async update => {
          await sqsHelper.addToQueue('ShareUpdates', { updateId: update._id });
        }));
      } else {
        console.log("TCL: cronPostUpdates.share event", event);
      }
    } catch (error) {
      console.error(error.message);
    }
  },

}
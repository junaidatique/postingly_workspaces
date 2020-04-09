const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const { APPROVED, BUFFER_SERVICE } = require('shared/constants');

const dbConnection = require('./db');

module.exports = {
  share: async function (event, context) {
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const dateTime = shared.dateTime;
    let updates;
    const next_five_minutes = dateTime.getRoundedDate(5);
    console.log("TCL: next_five_minutes", next_five_minutes)
    if (process.env.IS_OFFLINE === 'false') {
      updates = await UpdateModel.find(
        {
          scheduleState: APPROVED,
          scheduleTime: { $lte: next_five_minutes },
          service: { $ne: BUFFER_SERVICE }
        }
      );
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

    //
    updates = [];
    const next_fifteen_minutes = dateTime.getRoundedDate(15);
    console.log("TCL: next_fifteen_minutes", next_fifteen_minutes)
    if (process.env.IS_OFFLINE === 'false') {
      updates = await UpdateModel.find(
        {
          scheduleState: APPROVED,
          scheduleTime: { $lte: next_fifteen_minutes },
          service: BUFFER_SERVICE
        }
      );
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
  },

}
const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');
let changeCaption;
if (process.env.IS_OFFLINE) {
  changeCaption = require('functions/changeCaption');
}
const mongoose = require('mongoose');
let conn = null;

module.exports = {
  execute: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
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
      // console.log("TCL: services", services)
      await Promise.all(services.map(async service => {
        if (!_.isEmpty(event) && !_.isUndefined(event) && !_.isNull(event.storeId)) {
          storeId = event.storeId;
        }
        if (process.env.IS_OFFLINE) {
          await changeCaption.update({ service, storeId });
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
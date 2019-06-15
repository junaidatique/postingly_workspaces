const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, PENDING } = require('shared/constants');
let changeCaption;
if (process.env.IS_OFFLINE) {
  changeCaption = require('functions/changeCaption');
}


module.exports = {
  execute: async function (event, context) {
    let storeId = null;
    try {
      const UpdateModel = shared.UpdateModel;
      const services = await UpdateModel.distinct('service',
        {
          scheduleState: PENDING,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: SCHEDULE_TYPE_PRODUCT,
          rule: { $exists: true },
          autoApproveUpdates: true,
          autoAddCaptionOfUpdates: true,
          userEdited: false
        }
      );
      await Promise.all(services.map(async service => {
        if (_.isEmpty(event) && _.isNull(event.storeId)) {
          storeId = event.storeId;
        }

        await changeCaption.update({ service, storeId });
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
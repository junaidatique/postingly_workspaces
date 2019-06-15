const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, NOT_SCHEDULED } = require('shared/constants');
if (process.env.IS_OFFLINE) {
  facebookUpdates = require('functions/facebookUpdates');
}
const scheduleProducts = require('functions').scheduleProducts.schedule;

module.exports = {
  excute: async function (event, context) {
    try {
      const UpdateModel = shared.UpdateModel;
      const stores = await UpdateModel.distinct('store',
        {
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: SCHEDULE_TYPE_PRODUCT,
          rule: { $exists: true }
        }
      );
      console.log('stores', stores);
      await Promise.all(stores.map(async store => {
        const rules = await UpdateModel.distinct('rule',
          {
            scheduleState: NOT_SCHEDULED,
            scheduleTime: { $gt: moment.utc() },
            scheduleType: SCHEDULE_TYPE_PRODUCT,
            rule: { $exists: true }
          }
        );
        console.log('rules', rules);
        if (process.env.IS_OFFLINE) {
          await Promise.all(rules.map(async rule => {
            console.log('rule', rule);
            await scheduleProducts({ ruleId: rule })
          }));
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
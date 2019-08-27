const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED } = require('shared/constants');
const scheduleProducts = require('functions').scheduleProducts.schedule;

module.exports = {
  excute: async function (event, context) {
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
      if (process.env.IS_OFFLINE) {
        await Promise.all(rules.map(async rule => {
          await scheduleProducts({ ruleId: rule })
        }));
      }
    } catch (error) {
      console.error(error.message);
    }
  },
}
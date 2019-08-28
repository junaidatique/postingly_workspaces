const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED } = require('shared/constants');
const scheduleProducts = require('functions').scheduleProducts.schedule;
const mongoose = require('mongoose');
let conn = null;
module.exports = {
  excute: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
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
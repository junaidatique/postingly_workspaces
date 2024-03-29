const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED, RULE_TYPE_OLD } = require('shared/constants');
// const scheduleProducts = require('functions').scheduleProducts.schedule;
const dbConnection = require('./db');

module.exports = {
  execute: async function (event, context) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const rules = await UpdateModel.distinct('rule',
      {
        scheduleState: NOT_SCHEDULED,
        scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(1, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        postType: RULE_TYPE_OLD,
        isStoreDeleted: false
      }
    );
    if (process.env.IS_OFFLINE === 'false') {
      await Promise.all(rules.map(async rule => {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: rule });
      }));
    } else {
      console.log("TCL: cronThisWeekRulesForUpdates event", event)
    }
    await UpdateModel.updateMany({ "scheduleState": { $exists: false } }, { scheduleState: NOT_SCHEDULED })
  },
}
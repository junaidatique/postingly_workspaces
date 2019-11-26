const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, NOT_SCHEDULED, RULE_TYPE_OLD } = require('shared/constants');
// const scheduleProducts = require('functions').scheduleProducts.schedule;
const dbConnection = require('./db');

module.exports = {
  excute: async function (event, context) {
    console.log("TCL: event", event)
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const rules = await UpdateModel.distinct('rule',
      {
        scheduleState: NOT_SCHEDULED,
        scheduleTime: { $gt: moment.utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        postType: RULE_TYPE_OLD
      }
    );
    console.log("TCL: rules", rules)
    if (process.env.IS_OFFLINE === 'false') {
      await Promise.all(rules.map(async rule => {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: rule });
      }));
    } else {
      console.log("TCL: cronThisWeekRulesForUpdates event", event)
    }
  },
}
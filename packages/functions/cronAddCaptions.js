const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');

const dbConnection = require('./db');

module.exports = {
  execute: async function (event, context) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    await dbConnection.createConnection(context);
    let storeId = null;
    const UpdateModel = shared.UpdateModel;
    const rules = await UpdateModel.distinct('rule',
      {
        scheduleState: PENDING,
        scheduleTime: { $lt: moment.utc().add(3, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        URLForCaption: { $exists: true },
        autoApproveUpdates: { $ne: false },
        autoAddCaptionOfUpdates: { $ne: false },
        userEdited: false,
        captionsUpdated: false,
      }
    );
    if (process.env.IS_OFFLINE === 'false') {
      await Promise.all(rules.map(async rule => {
        if (!_.isEmpty(event) && !_.isUndefined(event) && !_.isNull(event.storeId)) {
          storeId = event.storeId;
        }
        await sqsHelper.addToQueue('ChangeCaption', { rule: rule, storeId: storeId });
      }));
    } else {
      console.log("TCL: cronAddCaptions event", event)

    }
  },

}
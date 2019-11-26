const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');

const dbConnection = require('./db');

module.exports = {
  execute: async function (event, context) {
    await dbConnection.createConnection(context);
    let storeId = null;
    const UpdateModel = shared.UpdateModel;
    const rules = await UpdateModel.distinct('rule',
      {
        scheduleState: PENDING,
        scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(3, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        autoApproveUpdates: { $ne: false },
        autoAddCaptionOfUpdates: { $ne: false },
        userEdited: false,
        captionsUpdated: false,
      }
    );
    console.log("TCL: rules", rules)
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
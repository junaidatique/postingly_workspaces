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
      console.log("TCL: services", services)
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(services.map(async service => {
          if (!_.isEmpty(event) && !_.isUndefined(event) && !_.isNull(event.storeId)) {
            storeId = event.storeId;
          }
          await sqsHelper.addToQueue('ShareUpdates', { service: service, storeId: storeId });
        }));
      } else {
        console.log("TCL: cronAddCaptions event", event)

      }
    } catch (error) {
      console.error(error.message);
    }
  },

}
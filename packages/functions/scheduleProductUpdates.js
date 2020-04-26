const shared = require('shared');
const scheduleClass = shared.scheduleClass;
const moment = require('moment');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const {
  NOT_SCHEDULED,
  PENDING,
  SCHEDULE_TYPE_PRODUCT,
  SCHEDULE_TYPE_VARIANT,
  POST_AS_OPTION_FB_ALBUM,
  POST_AS_OPTION_TW_ALBUM,
  POST_AS_OPTION_FB_PHOTO,
  POST_AS_OPTION_TW_PHOTO,
  COLLECTION_OPTION_ALL,
  COLLECTION_OPTION_SELECTED,
} = require('shared/constants');
const dbConnection = require('./db');
const schedulerHelper = require('./helpers/productScheduleFns')
module.exports = {
  // event = { ruleId: ID }
  schedule: async function (eventSQS, context) {
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    await dbConnection.createConnection(context);
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    await scheduleClass.schedule(event, context);
  },
}


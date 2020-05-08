const UpdateModel = require('shared').UpdateModel;
const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const ruleFunctions = require('../Rule/functions');
const productFunctions = require('../Product/functions');
const moment = require('moment');
const _ = require('lodash');
const { NOT_SCHEDULED, PENDING, APPROVED, POSTED, FAILED, PAUSED } = require('shared/constants')
const formattedUpdate = async (update) => {
  return {
    ...update._doc,
    id: update._id,
    store: storeFunctions.getStoreByID.bind(this, update._doc.store),
    profile: profileFunctions.getProfileById.bind(this, update._doc.profile),
    rule: ruleFunctions.getRuleById.bind(this, update._doc.rule),
    product: productFunctions.getProductById.bind(this, update._doc.product),
    scheduleTime: (update.scheduleTime !== undefined) ? moment(update.scheduleTime).toISOString() : null,
    createdAt: (update.createdAt !== undefined) ? moment(update.createdAt).toISOString() : null,
    updatedAt: (update.updatedAt !== undefined) ? moment(update.updatedAt).toISOString() : null,
  }
}

const dailyUpdateReportAggregate = async (matchFilter) => {
  res = await UpdateModel.aggregate([{
    "$match": matchFilter
  },
  {
    "$group": {
      "_id": "$scheduleState",
      "count": {
        "$sum": 1.0
      }
    }
  }]);
  let response = {
    notScheduledCount: calculateCountForDailyUpdateReport(res, NOT_SCHEDULED),
    pendingCount: calculateCountForDailyUpdateReport(res, PENDING),
    approvedCount: calculateCountForDailyUpdateReport(res, APPROVED),
    postedCount: calculateCountForDailyUpdateReport(res, POSTED),
    failedCount: calculateCountForDailyUpdateReport(res, FAILED),
    pausedCount: calculateCountForDailyUpdateReport(res, PAUSED),
  };
  return response;
}
const calculateCountForDailyUpdateReport = (res, key) => {
  const result = res.map(counter => {
    if (counter._id === key) {
      return counter.count;
    } else {
      return undefined;
    }
  }).filter(item => !_.isUndefined(item));
  return _.isEmpty(result) ? 0 : result[0];
}

exports.formattedUpdate = formattedUpdate
exports.dailyUpdateReportAggregate = dailyUpdateReportAggregate
exports.calculateCountForDailyUpdateReport = calculateCountForDailyUpdateReport

// exports.getUpdatesCount = getUpdatesCount
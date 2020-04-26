const shared = require('shared');
const _ = require('lodash')
const moment = require('moment')
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
module.exports = {
  allStorePosting: async (obj, args, context, info) => {
    console.log("TCL: allStorePosting args", args)
    const storeReport = [];
    let response;
    let matchFilter = {};
    if (!_.isUndefined(args.filter.storeId) && !_.isEmpty(args.filter.storeId)) {
      matchFilter.store = new ObjectId(args.filter.storeId);
    }
    if (!_.isUndefined(args.filter.serviceProfile) && !_.isEmpty(args.filter.serviceProfile)) {
      matchFilter.serviceProfile = args.filter.serviceProfile;
    }
    if (!_.isUndefined(args.filter.postType) && !_.isEmpty(args.filter.postType)) {
      matchFilter.postType = args.filter.postType;
    }
    if (!_.isUndefined(args.filter.postAsOption) && !_.isEmpty(args.filter.postAsOption)) {
      matchFilter.postAsOption = args.filter.postAsOption;
    }
    if (!_.isUndefined(args.filter.scheduleType) && !_.isEmpty(args.filter.scheduleType)) {
      matchFilter.scheduleType = args.filter.scheduleType;
    }
    if (!_.isUndefined(args.filter.scheduleState) && !_.isEmpty(args.filter.scheduleState)) {
      matchFilter.scheduleState = args.filter.scheduleState;
    }
    dayCounter = -2;
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    response = await module.exports.allStorePostingAggregate(matchFilter);
    storeReport.push({
      scheduleDayOfYear: matchFilter.scheduleDayOfYear,
      date: moment().utc().add(dayCounter, 'days').format("D/M/YYYY"),
      count: _.isEmpty(response) ? 0 : response[0].count
    })

    dayCounter = -1;
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    response = await module.exports.allStorePostingAggregate(matchFilter);
    storeReport.push({
      scheduleDayOfYear: matchFilter.scheduleDayOfYear,
      date: moment().utc().add(dayCounter, 'days').format("D/M/YYYY"),
      count: _.isEmpty(response) ? 0 : response[0].count
    })

    dayCounter = 0;
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    response = await module.exports.allStorePostingAggregate(matchFilter);
    storeReport.push({
      scheduleDayOfYear: matchFilter.scheduleDayOfYear,
      date: moment().utc().add(dayCounter, 'days').format("D/M/YYYY"),
      count: _.isEmpty(response) ? 0 : response[0].count
    })

    dayCounter = 1;
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    response = await module.exports.allStorePostingAggregate(matchFilter);
    storeReport.push({
      scheduleDayOfYear: matchFilter.scheduleDayOfYear,
      date: moment().utc().add(dayCounter, 'days').format("D/M/YYYY"),
      count: _.isEmpty(response) ? 0 : response[0].count
    })

    dayCounter = 2;
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    response = await module.exports.allStorePostingAggregate(matchFilter);
    storeReport.push({
      scheduleDayOfYear: matchFilter.scheduleDayOfYear,
      date: moment().utc().add(dayCounter, 'days').format("D/M/YYYY"),
      count: _.isEmpty(response) ? 0 : response[0].count
    })

    return storeReport;
  },
  allStorePostingAggregate: async function (matchFilter) {
    const UpdateModel = shared.UpdateModel;
    res = await UpdateModel.aggregate([{
      "$match": matchFilter
    },
    {
      "$group": {
        "_id": "$store",
      }
    },
    {
      "$count": "count"
    }]);
    return res;
  }

}
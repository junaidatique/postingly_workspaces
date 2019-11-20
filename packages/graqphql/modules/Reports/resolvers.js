const shared = require('shared');
const _ = require('lodash')
const moment = require('moment')
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
module.exports = {
  getStoreReport: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    const UpdateModel = shared.UpdateModel;
    const today = moment().dayOfYear();
    const fiveDaysAgo = moment().subtract(5, 'days').dayOfYear();
    const storeReport = [];
    for (i = -4; i <= 4; i++) {
      storeReport.push({
        scheduleDayOfYear: moment().add(i, 'days').dayOfYear(),
        date: moment().add(i, 'days').format("D/M/YYY")
      })
    }
    console.log("TCL: storeReport", storeReport)
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
    await Promise.all(storeReport.map(async storeReport => {
      matchFilter.scheduleDayOfYear = storeReport.scheduleDayOfYear;
      console.log("TCL: matchFilter", matchFilter)
      response = await UpdateModel.aggregate([{
        "$match": matchFilter
      },
      {
        "$group": {
          "_id": "$store",
        }
      },
      {
        "$count": "count"
      }])
      if (_.isEmpty(response)) {
        storeReport.count = 0;
      } else {
        storeReport.count = response[0].count;
      }
      console.log("TCL: response", response)
    }));
    // console.log("TCL: storeReport", storeReport)

    // console.log("TCL: reposne", reposne)
    // console.log("TCL: reposne", reposne[0])
    // console.log("TCL: reposne", reposne[0].count)
    // return [{
    //   count: reposne[0].count,
    //   scheduleDayOfYear: moment().dayOfYear()
    // }]
    return storeReport;
  }


}
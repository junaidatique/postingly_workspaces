const UpdateModel = require('shared').UpdateModel;
const ProfileModel = require('shared').ProfileModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query;
const _ = require('lodash')
const moment = require('moment');
const { APPROVED } = require('shared/constants');
const str = require('shared').stringHelper;
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    console.log("TCL: listUpdates args", args)
    try {

      searchQuery = {
        store: args.filter.storeId,
        profile: args.filter.profile,
        scheduleState: args.filter.scheduleState,
        scheduleTime: { "$gte": moment().utc() },
      }
      if (!_.isUndefined(args.filter.product)) {
        searchQuery.product = args.filter.product;
      }
      searchOptions = {
        sort: { scheduleTime: 1 },
        offset: args.skip,
        limit: args.limit
      }
      const updates = await UpdateModel.paginate(searchQuery, searchOptions);
      const updatesList = updates.docs.map(update => {
        return formattedUpdate(update)
      });
      return {
        updates: updatesList,
        totalRecords: updates.total
      }
    } catch (error) {
      throw error;
    }
  },
  deleteUpdate: async (obj, args, context, info) => {
    try {
      const updateDetail = await UpdateModel.findById(args.updateId);
      const updateDeleted = await UpdateModel.findByIdAndDelete(args.updateId);
      return formattedUpdate(updateDetail);
    } catch (error) {
      throw error;
    }
  },
  editUpdate: async (obj, args, context, info) => {
    try {
      const updateDetail = await UpdateModel.findById(args.updateId);
      updateDetail.text = args.input.text;
      updateDetail.postAsOption = args.input.postAsOption;
      updateDetail.scheduleTime = args.input.scheduleTime;
      updateDetail.images = args.input.images;
      updateDetail.scheduleState = args.input.scheduleState;
      updateDetail.userEdited = true;
      await updateDetail.save();
      return formattedUpdate(updateDetail);
    } catch (error) {
      throw error;
    }

  },
  createUpdate: async (obj, args, context, info) => {
    console.log("TCL: createUpdate args", args)
    try {
      const profiles = await ProfileModel.where('_id').in(args.input.profiles);
      const bulkUpdate = profiles.map(profile => {
        return {
          insertOne: {
            document: {
              store: args.input.store,
              text: args.input.text,
              postAsOption: args.input.postAsOption,
              scheduleTime: args.input.scheduleTime,
              images: args.input.images,
              product: args.input.product,
              scheduleType: args.input.scheduleType,
              service: args.input.service,
              serviceProfile: profile.serviceProfile,
              profile: profile._id,
              uniqKey: `${profile._id}-${args.input.product}-${args.input.scheduleTime}-${str.getRandomString(8)}`,
              scheduleState: APPROVED,
              userEdited: true
            }
          }
        }
      });
      const updateUpdates = await UpdateModel.bulkWrite(bulkUpdate);
    } catch (error) {
      throw error;
    }
  },
  updateReport: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      let searchQuery = {}
      if (!_.isUndefined(args.filter)) {
        if (!_.isUndefined(args.filter.storeId) && !_.isEmpty(args.filter.storeId)) {
          searchQuery.store = new ObjectId(args.filter.storeId);
        }
        if (!_.isUndefined(args.filter.storeIdsExcluded) && !_.isEmpty(args.filter.storeIdsExcluded)) {
          searchQuery.store = { $nin: args.filter.storeIdsExcluded.split(',') }
        }
        if (!_.isUndefined(args.filter.profile) && !_.isEmpty(args.filter.profile)) {
          searchQuery.profile = args.filter.profile;
        }
        if (!_.isUndefined(args.filter.service) && !_.isEmpty(args.filter.service)) {
          searchQuery.service = args.filter.service;
        }
        if (!_.isUndefined(args.filter.rule) && !_.isEmpty(args.filter.rule)) {
          searchQuery.rule = new ObjectId(args.filter.rule);
        }
        if (!_.isUndefined(args.filter.serviceProfile) && !_.isEmpty(args.filter.serviceProfile)) {
          searchQuery.serviceProfile = args.filter.serviceProfile;
        }
        if (!_.isUndefined(args.filter.postType) && !_.isEmpty(args.filter.postType)) {
          searchQuery.postType = args.filter.postType;
        }
        if (!_.isUndefined(args.filter.postAsOption) && !_.isEmpty(args.filter.postAsOption)) {
          searchQuery.postAsOption = args.filter.postAsOption;
        }
        if (!_.isUndefined(args.filter.scheduleType) && !_.isEmpty(args.filter.scheduleType)) {
          searchQuery.scheduleType = args.filter.scheduleType;
        }
        if (!_.isUndefined(args.filter.scheduleDate) && !_.isEmpty(args.filter.scheduleDate)) {
          const searchDate = new Date(args.filter.scheduleDate);
          let nextDate = new Date(args.filter.scheduleDate);
          nextDate.setDate(nextDate.getDate() + 1);
          searchQuery.scheduleTime = { $gte: searchDate, $lt: nextDate };
        }
        if (!_.isUndefined(args.filter.scheduleState) && !_.isEmpty(args.filter.scheduleState)) {
          searchQuery.scheduleState = args.filter.scheduleState;
        }
        if (!_.isUndefined(args.filter.failedMessage) && !_.isEmpty(args.filter.scheduleState)) {
          searchQuery.failedMessage = new RegExp(args.filter.failedMessage, "i");
        }
      }

      searchOptions = {
        sort: { scheduleTime: 1 },
        offset: args.skip,
        limit: args.limit
      }
      const updates = await UpdateModel.paginate(searchQuery, searchOptions);
      const updatesList = updates.docs.map(update => {
        return formattedUpdate(update)
      });
      return {
        updates: updatesList,
        totalRecords: updates.total
      }
    } catch (error) {
      throw error;
    }
  },
  dailyUpdateReport: async (obj, args, context, info) => {
    let matchFilter = {};
    let updateReport = [];
    let date;
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
    dayCounter = -2;
    response = await module.exports.dailyUpdateReportAggregate(dayCounter, matchFilter);
    updateReport.push(response)

    dayCounter = -1;
    response = await module.exports.dailyUpdateReportAggregate(dayCounter, matchFilter);
    updateReport.push(response)

    dayCounter = 0;
    response = await module.exports.dailyUpdateReportAggregate(dayCounter, matchFilter);
    updateReport.push(response)

    dayCounter = 1;
    response = await module.exports.dailyUpdateReportAggregate(dayCounter, matchFilter);
    updateReport.push(response)

    dayCounter = 2;
    response = await module.exports.dailyUpdateReportAggregate(dayCounter, matchFilter);
    updateReport.push(response)

    return updateReport;
  },
  dailyUpdateReportAggregate: async function (dayCounter, matchFilter) {
    date = moment().utc().add(dayCounter, 'days').format("D/M/YYYY");
    matchFilter.scheduleDayOfYear = moment().add(dayCounter, 'days').dayOfYear();
    // console.log("TCL: matchFilter", matchFilter)
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
    let resposne = {
      date: date,
      notScheduledCount: module.exports.clculateCountFordailyUpdateReport(res, 'not_scheduled'),
      pendingCount: module.exports.clculateCountFordailyUpdateReport(res, 'pending'),
      approvedCount: module.exports.clculateCountFordailyUpdateReport(res, 'approved'),
      postedCount: module.exports.clculateCountFordailyUpdateReport(res, 'posted'),
      failedCount: module.exports.clculateCountFordailyUpdateReport(res, 'failed'),
      pausedCount: module.exports.clculateCountFordailyUpdateReport(res, 'paused'),
    };
    return resposne;
  },
  clculateCountFordailyUpdateReport: (response, key) => {
    const result = res.map(counter => {
      if (counter._id === key) {
        return counter.count;
      } else {
        return undefined;
      }
    }).filter(item => !_.isUndefined(item));
    return _.isEmpty(result) ? 0 : result[0];
  }
}
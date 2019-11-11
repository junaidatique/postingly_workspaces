const UpdateModel = require('shared').UpdateModel;
const ProfileModel = require('shared').ProfileModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query;
const _ = require('lodash')
const moment = require('moment');
const { APPROVED } = require('shared/constants');
const str = require('shared').stringHelper;
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    console.log("TCL: listUpdates args", args.filter.product)
    console.log("TCL: listUpdates args", args)
    try {

      searchQuery = {
        store: args.filter.storeId,
        service: args.filter.service,
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
      console.log("TCL: searchQuery", searchQuery)
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
}
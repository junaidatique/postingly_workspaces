const UpdateModel = require('shared').UpdateModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query;
const moment = require('moment');
const { APPROVED } = require('shared/constants');
const str = require('shared').stringHelper;
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    try {

      searchQuery = {
        store: args.filter.storeId,
        service: args.filter.service,
        scheduleState: args.filter.scheduleState,
        scheduleTime: { "$gte": moment().utc() },
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
      await updateDetail.save();
      return formattedUpdate(updateDetail);
    } catch (error) {
      throw error;
    }

  },
  createUpdate: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      args.input.profiles.forEach(profileId => {

      });
      const bulkUpdate = args.input.profiles.map(profileId => {
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
              profile: profileId,
              uniqKey: `${profileId}-${args.input.product}-${args.input.scheduleTime}-${str.getRandomString(8)}`,
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
  }
}
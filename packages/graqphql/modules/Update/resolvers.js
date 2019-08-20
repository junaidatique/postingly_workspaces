const UpdateModel = require('shared').UpdateModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query;
const moment = require('moment');
const { APPROVED } = require('shared/constants');
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    try {
      searchQuery = query.createSearchQuery(UpdateModel, args);
      searchQuery = searchQuery.where('store').equals(args.filter.storeId);
      searchQuery = searchQuery.where('service').equals(args.filter.service);
      searchQuery = searchQuery.where('scheduleState').in(args.filter.scheduleState);
      searchQuery = searchQuery.where('scheduleTime').gte(moment().utc())
      const updates = await searchQuery.sort({ scheduleTime: 1 });
      console.log("TCL: updates", updates)
      return updatesList = updates.map(update => {
        return formattedUpdate(update)
      });
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
      updateDetail.postAsOption = args.input.postAsOption;
      updateDetail.text = args.input.text;
      updateDetail.scheduleTime = args.input.scheduleTime;
      updateDetail.images = args.input.images;
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
              uniqKey: `${profileId}-${args.input.scheduleTime}`,
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
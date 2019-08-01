const UpdateModel = require('shared').UpdateModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query;
const moment = require('moment');
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    try {
      searchQuery = query.createSearchQuery(UpdateModel, args);
      searchQuery = searchQuery.where('store').equals(args.filter.storeId);
      searchQuery = searchQuery.where('service').equals(args.filter.service);
      searchQuery = searchQuery.where('scheduleState').in(args.filter.scheduleState);
      searchQuery = searchQuery.where('scheduleTime').gte(moment().utc())
      const updates = await searchQuery.sort({ scheduleTime: 1 });
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
    console.log("TCL: args", args)
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

  }
}
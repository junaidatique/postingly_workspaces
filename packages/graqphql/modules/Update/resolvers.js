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
      const updates = await searchQuery;
      return updatesList = updates.map(update => {
        // console.log("TCL: update", update.scheduleTime.toDate().toISOString())
        return formattedUpdate(update)
      });
    } catch (error) {
      throw error;
    }
  }
}
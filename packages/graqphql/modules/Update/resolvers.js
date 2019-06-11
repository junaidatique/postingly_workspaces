const UpdateModel = require('shared').UpdateModel;
const formattedUpdate = require('./functions').formattedUpdate;
const query = require('shared').query
module.exports = {
  listUpdates: async (obj, args, context, info) => {
    try {
      searchQuery = query.createSearchQuery(UpdateModel, args);
      searchQuery = searchQuery.where('scheduleState', args.filter.scheduleState);
      const updates = await searchQuery;
      return updatesList = updates.map(update => {
        return formattedUpdate(update)
      });
    } catch (error) {
      throw error;
    }
  }
}
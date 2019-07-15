const CollectionModel = require('shared').CollectionModel;
const formattedCollection = require('./functions').formattedCollection
const query = require('shared').query;


module.exports = {
  listCollections: async (obj, args, context, info) => {
    try {
      let searchQuery = query.createSearchQuery(CollectionModel, args);
      searchQuery = searchQuery.find({ store: args.filter.storeId })
      const collections = await searchQuery;
      return collections.map(collection => {
        return formattedCollection(collection);
      })
    } catch (error) {
      throw error;
    }
  }
}
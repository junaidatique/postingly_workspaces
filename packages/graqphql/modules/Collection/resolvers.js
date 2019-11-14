const CollectionModel = require('shared').CollectionModel;
const formattedCollection = require('./functions').formattedCollection
const query = require('shared').query;


module.exports = {
  listCollections: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      let searchQuery = query.createSearchQuery(CollectionModel, args);
      console.log("TCL: searchQuery", searchQuery)
      searchQuery = searchQuery.find({ store: args.filter.storeId })
      const collections = await searchQuery;
      console.log("TCL: collections", collections)
      return collections.map(collection => {
        return formattedCollection(collection);
      })
    } catch (error) {
      throw error;
    }
  }
}
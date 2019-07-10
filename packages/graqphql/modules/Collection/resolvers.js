const CollectionModel = require('shared').CollectionModel;
const formattedCollection = require('./functions').formattedCollection
const query = require('shared').query;


module.exports = {
  listCollections: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      const searchQuery = query.createSearchQuery(CollectionModel, args);
      const collections = await searchQuery;
      return collections.map(collection => {
        return formattedCollection(collection);
      })
    } catch (error) {
      throw error;
    }
  }
}
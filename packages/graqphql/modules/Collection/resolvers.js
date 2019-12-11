const CollectionModel = require('shared').CollectionModel;
const formattedCollection = require('./functions').formattedCollection
const query = require('shared').query;
const _ = require('lodash');

module.exports = {
  listCollections: async (obj, args, context, info) => {
    console.log("TCL: listCollections args", args)
    try {
      // let searchQuery = query.createSearchQuery(CollectionModel, args);
      searchQuery = CollectionModel.find({ store: args.filter.storeId });
      if (!_.isEmpty(args.filter.title)) {
        searchQuery = searchQuery.where('title', new RegExp(args.filter.title, "i"));
      }
      const collections = await searchQuery;
      // console.log("TCL: collections", collections)
      return collections.map(collection => {
        return formattedCollection(collection);
      })
    } catch (error) {
      throw error;
    }
  }
}
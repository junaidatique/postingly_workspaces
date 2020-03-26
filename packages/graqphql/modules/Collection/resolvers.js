const CollectionModel = require('shared').CollectionModel;
const formattedCollection = require('./functions').formattedCollection
const query = require('shared').query;
const _ = require('lodash');

module.exports = {
  listCollections: async (obj, args, context, info) => {
    console.log("TCL: listCollections args", args)
    searchQuery = CollectionModel.find({ store: args.filter.storeId });
    if (!_.isEmpty(args.filter.title)) {
      searchQuery = searchQuery.where('title', new RegExp(args.filter.title, "i"));
    }
    console.log("searchQuery", searchQuery)
    const collections = await searchQuery;
    return collections.map(collection => {
      return formattedCollection(collection);
    })

  }
}
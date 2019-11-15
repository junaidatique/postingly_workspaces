const shared = require('shared');
const formattedStore = require('./functions').formattedStore
const getStoreByID = require('./functions').getStoreByID
const _ = require('lodash')
let conn;
const query = require('shared').query
module.exports = {
  listStores: async (obj, args, context, info) => {
    console.log("TCL: listStores args", args)
    const StoreModel = shared.StoreModel;
    try {
      let searchQuery = {}
      if (!_.isUndefined(args.filter)) {
        if (!_.isEmpty(args.filter.userId)) {
          searchQuery.userId = new RegExp(args.filter.userId, "i");
        }
        if (!_.isEmpty(args.filter.partner)) {
          searchQuery.partner = args.filter.partner;
        }
        if (!_.isEmpty(args.filter.partnerId)) {
          searchQuery.partnerId = args.filter.partnerId;
        }
        if (!_.isEmpty(args.filter.id) && args.filter.id.match(/^[0-9a-fA-F]{24}$/)) {
          searchQuery._id = args.filter.id;
        }
        if (!_.isEmpty(args.filter.title)) {
          searchQuery.title = new RegExp(args.filter.title, "i");
        }
        searchQuery.isUninstalled = (_.isUndefined(args.filter.isUninstalled)) ? false : args.filter.isUninstalled;
      }
      const searchOptions = {
        sort: { createdAt: -1 },
        populate: 'profiles',
        offset: args.skip,
        limit: _.isUndefined(args.limit) ? 10 : args.limit
      }
      const stores = await StoreModel.paginate(searchQuery, searchOptions);
      const list = storesList = stores.docs.map(store => {
        return formattedStore(store)
      });
      return {
        stores: list,
        totalRecords: stores.total
      }
    } catch (error) {
      console.log("TCL: error1", error)
      throw error;
    }
  },
  getStore: async (obj, args, context, info) => {
    try {
      return getStoreByID(args.id);
    } catch (error) {
      throw error;
    }
  },

  createStore: async (obj, args, context, info) => {
    try {
      const StoreModel = shared.StoreModel;
      storeKey = `${args.input.partner}-${args.input.partnerId}`;
      let shopParams = {};
      for (item in args.input) {
        if (item !== "id" || item !== "uniqKey") {
          shopParams[item] = args.input[item];
        }
      }
      store = await StoreModel.updateOne({ uniqKey: storeKey }, shopParams, { upsert: true });
      let storeDetail = await StoreModel.findOne({ uniqKey: storeKey });
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
  },
  updateStore: async (obj, args, context, info) => {
    try {
      const StoreModel = shared.StoreModel;
      storeKey = args.input.id;
      let shopParams = {};
      for (item in args.input) {
        if (item !== 'id' && item !== "uniqKey") {
          shopParams[item] = args.input[item];
        }
      }
      store = await StoreModel.updateOne({ _id: storeKey }, shopParams)
      const storeDetail = await StoreModel.findById(storeKey);
      return formattedStore(storeDetail);
    } catch (error) {
      throw error;
    }
  }


}
const shared = require('shared');
const formattedStore = require('./functions').formattedStore
const getStoreByUniqKey = require('./functions').getStoreByUniqKey
let conn;
const query = require('shared').query
module.exports = {
  listStores: async (obj, args, context, info) => {
    const StoreModel = shared.StoreModel;
    try {
      searchQuery = query.createSearchQuery(StoreModel, args);
      const stores = await searchQuery.populate('profiles');
      console.log("TCL: stores", stores)
      const list = storesList = stores.map(store => {
        return formattedStore(store)
      });
      return list;
    } catch (error) {
      console.log("TCL: error1", error)
      throw error;
    }
  },
  getStore: async (obj, args, context, info) => {
    try {
      return getStoreByUniqKey(args.uniqKey);
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
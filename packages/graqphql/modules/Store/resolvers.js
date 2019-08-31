const shared = require('shared');
const formattedStore = require('./functions').formattedStore
const getStoreByUniqKey = require('./functions').getStoreByUniqKey
let conn;
const query = require('shared').query
module.exports = {
  listStores: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    const StoreModel = shared.StoreModel;
    console.log("TCL: StoreModel", StoreModel)
    try {
      searchQuery = query.createSearchQuery(StoreModel, args);
      console.log("TCL: searchQuery", searchQuery)
      const stores = await searchQuery.populate('profiles');
      console.log("TCL: stores", stores)
      const list = storesList = stores.map(store => {
        return formattedStore(store)
      });
      console.log("TCL: list", list)
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
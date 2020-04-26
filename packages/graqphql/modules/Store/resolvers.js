const shared = require('shared');
const formattedStore = require('./functions').formattedStore
const getStoreByID = require('./functions').getStoreByID
const _ = require('lodash')
const { PRO_PLAN } = require('shared/constants');
let conn;
const query = require('shared').query
module.exports = {
  listStores: async (obj, args, context, info) => {
    console.log("TCL: listStores args", args)
    const StoreModel = shared.StoreModel;

    let searchQuery = {}
    if (!_.isUndefined(args.filter)) {
      if (!_.isEmpty(args.filter.userId)) {
        searchQuery.userId = args.filter.userId;
      }
      if (!_.isEmpty(args.filter.email)) {
        searchQuery.email = new RegExp(args.filter.email, "i");
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
  },
  getStore: async (obj, args, context, info) => {
    return getStoreByID(args.id);
  },

  createStore: async (obj, args, context, info) => {
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
  },
  updateStore: async (obj, args, context, info) => {
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
  },
  upgradePlan: async (obj, args, context, info) => {
    console.log("TCL: upgradePlan args", args)
    const StoreModel = shared.StoreModel;
    const PartnerShopify = shared.PartnerShopify;
    const storeDetail = await StoreModel.findById(args.storeId);
    const response = await PartnerShopify.getChargeURL({ storePartnerId: storeDetail.uniqKey, planName: args.plan }, new Date())
    return response;

  },


}
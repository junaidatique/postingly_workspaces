const Store = require('shared').StoreModel;
const formattedStore = require('./functions').formattedStore
const UserInputError = require('apollo-server-express').UserInputError
const query = require('shared').query
module.exports = {
  listStores: async (obj, args, context, info) => {
    console.log('args', args);
    try {
      searchQuery = query.createSearchQuery(Store, args);
      const stores = await searchQuery;
      return storesList = stores.map(store => {
        return formattedStore(store)
      });
    } catch (error) {
      throw error;
    }
  },
  getStore: async (obj, args, context, info) => {
    try {
      const storeDetail = await Store.findOne({ uniqKey: args.uniqKey });
      if (storeDetail === null) {
        throw new UserInputError('Store not found.');
      }
      return formattedStore(storeDetail);
    } catch (error) {
      throw error;
    }
  },

  createStore: async (obj, args, context, info) => {
    try {
      storeKey = `${args.input.partner}-${args.input.partnerId}`;
      let storeDetail = await Store.findOne({ uniqKey: storeKey });
      if (storeDetail === null) {
        const shopParams = {
          userId: args.input.userId,
          title: args.input.title,
          url: args.input.url,
          partner: args.input.partner,
          partnerId: args.input.partnerId,
          partnerPlan: args.input.partnerPlan,
          partnerSpecificUrl: args.input.partnerSpecificUrl,
          partnerCreatedAt: args.input.partnerCreatedAt,
          partnerUpdatedAt: args.input.partnerUpdatedAt,
          partnerToken: args.input.partnerToken,
          uniqKey: storeKey,
          timezone: args.input.timezone,
          moneyFormat: args.input.moneyFormat,
          moneyWithCurrencyFormat: args.input.moneyWithCurrencyFormat,
          numberOfProducts: args.input.numberOfProducts,
          noOfActiveProducts: args.input.noOfActiveProducts,
          numberOfScheduledPosts: args.input.numberOfScheduledPosts,
          numberOfPosted: args.input.numberOfPosted,
          productsLastUpdated: args.input.productsLastUpdated,
          isCharged: args.input.isCharged,
          chargedMethod: args.input.chargedMethod,
          chargeId: args.input.chargeId,
          chargeDate: args.input.chargeDate,
          isUninstalled: args.input.isUninstalled,
        };
        const storeInstance = new Store(shopParams);
        storeDetail = await storeInstance.save();
      } else {
        let shopParams = {};
        for (item in args.input) {
          if (item !== "id" || item !== "uniqKey") {
            shopParams[item] = args.input[item];
          }
          // console.log(item, args.input[item]);
        }
        store = await Store.updateOne({ uniqKey: storeKey }, shopParams)
        storeDetail = await Store.findOne({ uniqKey: storeKey });
      }
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
  },
  updateStore: async (obj, args, context, info) => {
    try {
      storeKey = `${args.input.uniqKey}`;
      let shopParams = {};
      for (item in args.input) {
        if (item !== "id" || item !== "uniqKey") {
          shopParams[item] = args.input[item];
        }
        // console.log(item, args.input[item]);
      }
      store = await Store.updateOne({ uniqKey: storeKey }, shopParams)
      const storeDetail = await Store.findOne({ uniqKey: storeKey });
      return formattedStore(storeDetail);
    } catch (error) {
      throw error;
    }
  }


}
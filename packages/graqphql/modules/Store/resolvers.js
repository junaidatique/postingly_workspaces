const Store = require('shared').StoreModel;
const formattedStore = require('./functions').formattedStore
module.exports = {
  getStore: async (obj, args, context, info) => {
    try {
      const storeDetial = await Store.get(args);
      return formattedStore(storeDetial);
    } catch (error) {
      throw error;
    }
  },

  createStore: async (obj, args, context, info) => {
    try {
      storeKey = `${args.input.partner}-${args.input.partnerId}`;
      const shopParams = {
        id: storeKey,
        userId: args.input.userId,
        partner: args.input.partner,
        partnerId: args.input.partnerId,
        partnerPlan: args.input.partnerPlan,
        title: args.input.title,
        storeUrl: args.input.storeUrl,
        partnerSpecificUrl: args.input.partnerSpecificUrl,
        partnerCreatedAt: args.input.partnerCreatedAt,
        partnerUpdatedAt: args.input.partnerUpdatedAt,
        partnerToken: args.input.partnerToken,
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

      store = new Store(shopParams);
      storeDetail = await store.save();
      return formattedStore(storeDetail);
    } catch (error) {
      throw error;
    }
  },
  updateStore: async (obj, args, context, info) => {
    try {
      storeKey = `${args.input.id}`;
      let shopParams = {};
      for (item in args.input) {
        if (item !== "id") {
          shopParams[item] = args.input[item];
        }
        // console.log(item, args.input[item]);
      }
      store = await Store.update({ id: storeKey }, shopParams)

      return formattedStore(store);
    } catch (error) {
      throw error;
    }
  }


}
const storeResolvers = require('./Store/resolvers');
const profileResolvers = require('./Profile/resolvers');
const ruleResolvers = require('./Rule/resolvers');
const productResolvers = require('./Product/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore,
    listStores: storeResolvers.listStores,
    listProfiles: profileResolvers.listProfiles,
    listRules: ruleResolvers.listRules,
    listProducts: productResolvers.listProducts
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore,
    connectProfile: profileResolvers.connectProfile,
    updateProfile: profileResolvers.updateProfile,
    manageRule: ruleResolvers.manageRule
  },
}
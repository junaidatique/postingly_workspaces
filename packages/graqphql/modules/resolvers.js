const storeResolvers = require('./Store/resolvers');
const profileResolvers = require('./Profile/resolvers');
const ruleResolvers = require('./Rule/resolvers');
const productResolvers = require('./Product/resolvers');
const collectionResolvers = require('./Collection/resolvers');
const updateResolvers = require('./Update/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore,
    listStores: storeResolvers.listStores,
    listProfiles: profileResolvers.listProfiles,
    listRules: ruleResolvers.listRules,
    getRule: ruleResolvers.getRule,
    listProducts: productResolvers.listProducts,
    listCollections: collectionResolvers.listCollections,
    listUpdates: updateResolvers.listUpdates
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore,
    connectProfile: profileResolvers.connectProfile,
    updateProfile: profileResolvers.updateProfile,
    deleteProfile: profileResolvers.deleteProfile,
    manageRule: ruleResolvers.manageRule,
    deleteRule: ruleResolvers.deleteRule,
    deleteUpdate: updateResolvers.deleteUpdate,
    editUpdate: updateResolvers.editUpdate,
    createUpdate: updateResolvers.createUpdate,
    syncProducts: productResolvers.syncProducts,
    syncProfiles: profileResolvers.syncProfiles
  },
}
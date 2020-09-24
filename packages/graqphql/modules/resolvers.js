const storeResolvers = require('./Store/resolvers');
const profileResolvers = require('./Profile/resolvers');
const ruleResolvers = require('./Rule/resolvers');
const productResolvers = require('./Product/resolvers');
const collectionResolvers = require('./Collection/resolvers');
const updateResolvers = require('./Update/resolvers');
const reportResolvers = require('./Reports/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore,
    listStores: storeResolvers.listStores,
    getProfile: profileResolvers.getProfile,
    listProfiles: profileResolvers.listProfiles,
    listRules: ruleResolvers.listRules,
    getRule: ruleResolvers.getRule,
    listProducts: productResolvers.listProducts,
    listCollections: collectionResolvers.listCollections,
    listUpdates: updateResolvers.listUpdates,
    allStorePosting: reportResolvers.allStorePosting,
    dailyUpdateReport: updateResolvers.dailyUpdateReport,
    updateReport: updateResolvers.updateReport,
    getBufferUpdates: profileResolvers.getBufferUpdates,
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore,
    connectProfile: profileResolvers.connectProfile,
    updateConnectProfile: profileResolvers.updateConnectProfile,
    updateProfile: profileResolvers.updateProfile,
    deleteProfile: profileResolvers.deleteProfile,
    manageRule: ruleResolvers.manageRule,
    changeRuleStatus: ruleResolvers.changeRuleStatus,
    deleteUpdate: updateResolvers.deleteUpdate,
    editUpdate: updateResolvers.editUpdate,
    createUpdate: updateResolvers.createUpdate,
    syncProducts: productResolvers.syncProducts,
    deleteBufferUpdate: profileResolvers.deleteBufferUpdate,
    upgradePlan: storeResolvers.upgradePlan,
    deleteProductsUpdateWebhook: storeResolvers.deleteProductsUpdateWebhook,
    connectInstagram: profileResolvers.connectInstagram,
  },
}
const storeResolvers = require('./Store/resolvers');
const profileResolvers = require('./Profile/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore,
    listStores: storeResolvers.listStores
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore,
    connectProfile: profileResolvers.connectProfile
  },
}
const storeResolvers = require('./Store/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore,
    listStores: storeResolvers.listStores
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore
  },
}
const storeResolvers = require('./Store/resolvers');

module.exports = {
  Query: {
    getStore: storeResolvers.getStore
  },
  Mutation: {
    createStore: storeResolvers.createStore,
    updateStore: storeResolvers.updateStore
  },
}
const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const mongoose = require('mongoose');
let conn = null;
module.exports = {
  syncStoreData: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncStoreData(event);
    }
  },
  syncCollections: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollections(event);
    }
  },
  syncCollectionPage: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollections(event);
    }
  },
  syncProducts: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProducts(event);
    }
  },
  syncProductPage: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProductPage(event);
    }
  },
}
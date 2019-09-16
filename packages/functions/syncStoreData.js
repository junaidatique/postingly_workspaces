const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const mongoose = require('mongoose');
const dbConnection = require('./db');
let conn = null;
module.exports = {
  syncStoreData: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncStoreData(event);
    }
  },
  syncCollections: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollections(event);
    }
  },
  syncCollectionPage: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollectionPage(event);
    }
  },
  syncProducts: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProducts(event);
    }
  },
  syncProductPage: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProductPage(event);
    }
  },
}
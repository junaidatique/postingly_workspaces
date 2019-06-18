const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const shopifyAPI = require('./partners/shopify');
module.exports = {
  syncCollections: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      await shopifyAPI.syncCollections(event);
    }
  },
  syncCollectionPage: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      await shopifyAPI.syncCollections(event);
    }
  },
  syncProducts: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      await shopifyAPI.syncProducts(event);
    }
  },
  syncProductPage: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      await shopifyAPI.syncProductPage(event);
    }
  },
}
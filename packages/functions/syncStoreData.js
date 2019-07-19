const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants');
module.exports = {
  syncStoreData: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncStoreData(event);
    }
  },
  syncCollections: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollections(event);
    }
  },
  syncCollectionPage: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncCollections(event);
    }
  },
  syncProducts: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProducts(event);
    }
  },
  syncProductPage: async function (event) {
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.syncProductPage(event);
    }
  },
}
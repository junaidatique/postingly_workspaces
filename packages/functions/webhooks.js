const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const dbConnection = require('./db');
module.exports = {
  getWebhooks: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.getWebhooks(event);
    }
  },
  createWebhooks: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.createWebhooks(event);
    }
  },
  deleteWebhooks: async function (event, context) {
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.deleteWebhooks(event);
    }
  },

}
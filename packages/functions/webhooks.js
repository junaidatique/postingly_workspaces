const shared = require('shared');
const _ = require('lodash');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const dbConnection = require('./db');
module.exports = {
  getWebhooks: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: getWebhooks event", event);
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.getWebhooks(event);
    }
  },
  createWebhooks: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: createWebhooks event", event);
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.createWebhooks(event);
    }
  },
  deleteWebhooks: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: deleteWebhooks event", event);
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.deleteWebhooks(event);
    }
  },
  deleteSingleWebhook: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: deleteWebhooks event", event);
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.deleteSingleWebhook(event);
    }
  },
  productsCreate: async function (eventSQS, context) {
    console.log("TCL: productsCreate eventSQS", eventSQS)
    const event = JSON.parse(eventSQS.Records[0].body);
    console.log("TCL: productsCreate event", event)
    await dbConnection.createConnection(context);
    if (event.partnerStore === PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.productsCreate(event);
    }
  },
  productsUpdate: async function (eventSQS, context) {
    const event = JSON.parse(eventSQS.Records[0].body);
    await dbConnection.createConnection(context);
    if (event.partnerStore === PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.productsUpdate(event);
    }
  },
  productsDelete: async function (eventSQS, context) {
    const event = JSON.parse(eventSQS.Records[0].body);
    console.log("TCL: productsDelete event", event)
    await dbConnection.createConnection(context);
    if (event.partnerStore == PARTNERS_SHOPIFY) {
      const shopifyAPI = shared.PartnerShopify;
      await shopifyAPI.productsDelete(event);
    }
  },

}
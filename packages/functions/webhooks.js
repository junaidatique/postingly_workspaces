const shared = require('shared');
const _ = require('lodash');
const { PARTNERS_SHOPIFY } = require('shared/constants');
const dbConnection = require('./db');
const sqsHelper = require('shared').sqsHelper;
module.exports = {
  cronWebhooks: async function (eventSQS, context) {
    await dbConnection.createConnection(context);
    const StoreModel = require('shared').StoreModel;
    const stores = await StoreModel.find({ isUninstalled: false });

    await Promise.all(stores.map(async storeDetail => {
      if (!_.isNull(storeDetail)) {
        const webhookPayload = {
          partnerStore: PARTNERS_SHOPIFY,
          shopURL: storeDetail.partnerSpecificUrl,
          accessToken: storeDetail.partnerToken,
          storeId: storeDetail._id
        }
        if (process.env.IS_OFFLINE === 'false') {
          await sqsHelper.addToQueue('CreateWebhooks', webhookPayload);
        } else {
          // this.getWebhooks(webhookPayload);
        }

      }
    }))
  },
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


}
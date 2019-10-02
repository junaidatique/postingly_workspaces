const shared = require('shared');

const webhooks = require('functions').webhooks;

const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findOne().limit(1)
    await webhooks.getWebhooks({
      partnerStore: storeDetail.partner,
      shopURL: storeDetail.url,
      accessToken: storeDetail.partnerToken
    })
    // await webhooks.createWebhooks({
    //   partnerStore: storeDetail.partner,
    //   shopURL: storeDetail.url,
    //   accessToken: storeDetail.partnerToken
    // })
    // await webhooks.deleteWebhooks({
    //   partnerStore: storeDetail.partner,
    //   shopURL: storeDetail.url,
    //   accessToken: storeDetail.partnerToken
    // })



  }
}
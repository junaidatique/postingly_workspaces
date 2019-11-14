const shared = require('shared');

// const webhooks = require('functions').webhooks;

const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const PartnerShopify = shared.PartnerShopify;
    // const storeDetail = await StoreModel.findOne()
    const storeDetail = await StoreModel.findById('5dc7337f375a3800087eda4e')
    // await webhooks.getWebhooks()
    const webhooksPayload = {
      partnerStore: storeDetail.partner,
      shopURL: storeDetail.url,
      accessToken: storeDetail.partnerToken,
      storeId: storeDetail._id
    };
    console.log("TCL: webhooksPayload", JSON.stringify(webhooksPayload))
    console.log("TCL: encodeURI(s).split(/%..|./).length - 1", encodeURI(JSON.stringify(webhooksPayload)).split(/%..|./).length - 1)
    // console.log("TCL: webhooksPayload", webhooksPayload)
    // await PartnerShopify.deleteWebhooks(webhooksPayload);
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
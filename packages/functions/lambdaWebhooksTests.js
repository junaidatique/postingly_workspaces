const shared = require('shared');
const Intercom = require('intercom-client');
const fetch = require('node-fetch');
const _ = require('lodash');
const dbConnection = require('./db');
// const webhooks = require('functions').webhooks;

const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    await dbConnection.createConnection(context);
    const StoreModel = shared.StoreModel;

    const rules = await UpdateModel.distinct('rule',
      {
        scheduleState: NOT_SCHEDULED,
        scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(1, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        postType: RULE_TYPE_OLD
      }
    );
    console.log("TCL: rules", rules)

    const rules1 = await UpdateModel.distinct('rule',
      {
        scheduleState: NOT_SCHEDULED,
        scheduleTime: { $gt: new Date(moment.utc().format('YYYY-MM-DD')), $lt: new Date(moment.utc().add(1, 'days').format('YYYY-MM-DD')) },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        postType: RULE_TYPE_OLD
      }
    );
    console.log("TCL: rules1", rules1)
    // ---------------------------------------------------------



    // await webhooks.getWebhooks()
    // const webhooksPayload = {
    //   partnerStore: storeDetail.partner,
    //   shopURL: storeDetail.url,
    //   accessToken: storeDetail.partnerToken,
    //   storeId: storeDetail._id
    // };
    // console.log("TCL: webhooksPayload", JSON.stringify(webhooksPayload))
    // console.log("TCL: encodeURI(s).split(/%..|./).length - 1", encodeURI(JSON.stringify(webhooksPayload)).split(/%..|./).length - 1)
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
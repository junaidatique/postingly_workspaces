const shared = require('shared');
const Intercom = require('intercom-client');
const fetch = require('node-fetch');
const _ = require('lodash');
const dbConnection = require('./db');
// const webhooks = require('functions').webhooks;

const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    console.log("event", event)
    await dbConnection.createConnection(context);
    const ProductModel = shared.ProductModel;
    const products = await ProductModel.find({ "postableIsNew": true, "shareHistory.postType": "new", "shareHistory.counter": 0 }).limit(250)
    console.log("products", products.length)

    let updateItemShareHistory = [];
    const updateProducts = products.map(item => {
      updateItemShareHistory = [];
      updateItemShareHistory = item.shareHistory.map(itemScheduleHistory => {
        if (itemScheduleHistory.counter === 0) {
          return undefined
        } else {
          return itemScheduleHistory;
        }
      }).filter(item => !_.isUndefined(item));


      return {
        updateOne: {
          filter: { uniqKey: item.uniqKey },
          update: {
            shareHistory: updateItemShareHistory
          }
        }
      }
    });
    if (!_.isEmpty(updateProducts)) {
      const products = await ProductModel.bulkWrite(updateProducts);
    }
    // const StoreModel = shared.StoreModel;

    // const rules = await UpdateModel.distinct('rule',
    //   {
    //     scheduleState: NOT_SCHEDULED,
    //     scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(1, 'days') },
    //     scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
    //     rule: { $exists: true },
    //     postType: RULE_TYPE_OLD
    //   }
    // );
    // console.log("TCL: rules", rules)

    // const rules1 = await UpdateModel.distinct('rule',
    //   {
    //     scheduleState: NOT_SCHEDULED,
    //     scheduleTime: { $gt: new Date(moment.utc().format('YYYY-MM-DD')), $lt: new Date(moment.utc().add(1, 'days').format('YYYY-MM-DD')) },
    //     scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
    //     rule: { $exists: true },
    //     postType: RULE_TYPE_OLD
    //   }
    // );
    // console.log("TCL: rules1", rules1)
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
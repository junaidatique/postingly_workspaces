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
    var client = new Intercom.Client({ token: 'my_token' });

    const PartnerShopify = shared.PartnerShopify;
    const intercomClient = new Intercom.Client({ token: process.env.INTERCOM_API_TOKEN });
    // const storeDetail = await StoreModel.findOne()
    // const storeDetail = await StoreModel.findById('5dc439c89a44ab02a5ace9bf');
    // console.log("TCL: storeDetail", storeDetail)
    const stores = await StoreModel.find({ email: { $exists: false } });
    console.log("TCL: stores", stores.length)
    await Promise.all(stores.map(async store => {
      console.log("TCL: store", store._id);
      shop = await PartnerShopify.getShop(store.partnerSpecificUrl, store.partnerToken);
      if (!_.isUndefined(shop)) {
        store.email = shop.email;
        user = await intercomClient.users.create({
          user_id: store.uniqKey, email: shop.email,
          custom_attributes: {
            storeTitle: store.title,
            partner: store.partner
          }
        });
        console.log("TCL: user", user.body)
        store.intercomId = user.body.id;
        await store.save();
      }

    }))
    // ---------------------------------------------------------
    // const intercomClient = new Intercom.Client({ token: process.env.INTERCOM_API_TOKEN });
    // const users = await intercomClient.users.list();
    // console.log("TCL: users", users.body.total_count)
    // console.log("TCL: users", users.body.pages)
    // console.log("TCL: users", users.body.users.length)
    // ---------------------------------------------------------
    // user = await intercomClient.users.create({ user_id: storeDetail.uniqKey });
    // console.log("TCL: user", user.body)
    // storeDetail.intercomId = user.body.id;
    // await storeDetail.save();
    // ---------------------------------------------------------
    // intercomDeleteBody = JSON.stringify({ intercom_user_id: storeDetail.intercomId });
    // const res = await fetch("https://api.intercom.io/user_delete_requests", {
    //   body: intercomDeleteBody,
    //   headers: {
    //     "Accept": "application/json",
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${process.env.INTERCOM_API_TOKEN}`,
    //   },
    //   method: "POST"
    // })
    // console.log("TCL: intercomDeleteBody", intercomDeleteBody)
    // console.log("TCL: res", res)
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
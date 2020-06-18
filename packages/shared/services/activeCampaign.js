const fetch = require("node-fetch");
const StoreModel = require('shared').StoreModel;
const { ACTIVE_CAMPAIGN_URL } = require('shared/constants');

module.exports = {
  syncContact: async function (storeId) {
    console.log("storeId", storeId)
    const storeDetail = await StoreModel.findById(storeId);
    const body = {
      email: storeDetail.email,
    }
    const contactResponse = await fetch(`${ACTIVE_CAMPAIGN_URL}contact/sync`, {
      body,
      headers: {
        "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY,
      },
      method: 'POST'
    }).then(response => response.json());
    console.log("contactResponse", contactResponse)
  }
}
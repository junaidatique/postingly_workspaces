const shared = require('shared');
const str = require('shared').stringHelper;
let syncStoreData;
let createUpdates;
let schedule;
let addCaptions;
let postUpdates;
syncStoreData = require('functions').syncStoreData.syncStoreData;
createUpdates = require('functions').createUpdates.createUpdates;
schedule = require('functions').scheduleProducts.schedule;
addCaptions = require('functions').cronAddCaptions.execute;
postUpdates = require('functions').postUpdates.share;
module.exports = {
  execute: async function (event, context) {
    // const storeId = "5d0750dba96a8dd6c8799110";
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
    const UpdateModel = shared.UpdateModel;
    const VariantModel = shared.VariantModel;

    const RuleModel = shared.RuleModel;
    await UpdateModel.collection.deleteMany({ _id: { $exists: true } });

    await CollectionModel.collection.deleteMany({ _id: { $exists: true } });
    await ImageModel.collection.deleteMany({ _id: { $exists: true } });
    await ProductModel.collection.deleteMany({ _id: { $exists: true } });
    await VariantModel.collection.deleteMany({ _id: { $exists: true } });
    await syncStoreData({
      "storeId": storeId,
      "partnerStore": "shopify",
      "collectionId": null
    })

    const ruleDetail = await RuleModel.findOne({ store: storeId });
    await createUpdates({ ruleId: ruleDetail._id, scheduleWeek: 'next' });
    await schedule({ ruleId: ruleDetail._id });
    await addCaptions();
    // await postUpdates();




  }
}
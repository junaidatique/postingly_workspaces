const shared = require('shared');
const moment = require('moment');

const str = require('shared').stringHelper;
const syncStoreData = require('functions').syncStoreData.syncStoreData;
const syncCollectionPage = require('functions').syncStoreData.syncCollectionPage;
const syncProductPage = require('functions').syncStoreData.syncProductPage;
const createUpdates = require('functions').createUpdates.createUpdates;
const createUpdatesforNextWeek = require('functions').createUpdates.createUpdatesforNextWeek;
const schedule = require('functions').scheduleProducts.schedule;
const cronThisWeekRulesForUpdates = require('functions').cronThisWeekRulesForUpdates.excute;
const cronAddCaptions = require('functions').cronAddCaptions.execute;
const changeCaption = require('functions').changeCaption.update;
const cronPostUpdates = require('functions').cronPostUpdates.share;
const shareUpdates = require('functions').shareUpdates.share;
const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {


    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;
    const store = await StoreModel.find({ _id: { $exists: true } }).limit(1)
    const storeDetail = store[0];
    const storeId = storeDetail._id;
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
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
    await syncCollectionPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null });
    await syncProductPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
    const ruleDetail = await RuleModel.findOne({ store: storeId });
    await createUpdates({ ruleId: ruleDetail._id });
    await createUpdatesforNextWeek();
    await cronThisWeekRulesForUpdates();

    await schedule({ ruleId: ruleDetail._id });
    // await cronAddCaptions();
    // await changeCaption({ service: FACEBOOK_SERVICE, storeId: null });
    // await cronPostUpdates();
    // updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } }).limit(1);
    // await shareUpdates({ updateId: updates[0]._id });


  }
}
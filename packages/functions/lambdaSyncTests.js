const shared = require('shared');
const syncStoreData = require('functions').syncStoreData.syncStoreData;
const syncCollectionPage = require('functions').syncStoreData.syncCollectionPage;
const syncProductPage = require('functions').syncStoreData.syncProductPage;
const { PARTNERS_SHOPIFY } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findOne().limit(1)
    const storeId = storeDetail._id;
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
    const VariantModel = shared.VariantModel;
    const UpdateModel = shared.UpdateModel;


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
    await syncCollectionPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null, productId: null });
    await syncProductPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
  }
}
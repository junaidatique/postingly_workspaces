const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const PartnerShopify = shared.PartnerShopify;
    // const storeDetail = await StoreModel.findOne().limit(1)
    const storeDetail = await StoreModel.findById('5dc4c7b2f5de187854e125b9')
    const storeId = storeDetail._id;
    // const storeId = '5dc4c7b2f5de187854e125b9';
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
    const VariantModel = shared.VariantModel;
    const UpdateModel = shared.UpdateModel;


    await UpdateModel.collection.deleteMany({ store: storeId });
    await CollectionModel.collection.deleteMany({ store: storeId });
    await ImageModel.collection.deleteMany({ store: storeId });
    await ProductModel.collection.deleteMany({ store: storeId });
    await VariantModel.collection.deleteMany({ store: storeId });


    await PartnerShopify.productsCreate({ partnerStore: storeDetail.partner, shopDomain: storeDetail.partnerSpecificUrl, partnerId: '4360078557299' });
    // await PartnerShopify.syncStoreData({
    //   "storeId": storeId,
    //   "partnerStore": "shopify",
    //   "collectionId": null
    // })
    // await syncCollectionPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null, productId: null });
    // await syncProductPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
  }
}
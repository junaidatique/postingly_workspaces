const shared = require('shared');
const { PARTNERS_SHOPIFY } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const PartnerShopify = shared.PartnerShopify;
    // const storeDetail = await StoreModel.findOne();
    const storeDetail = await StoreModel.findById('5de8fdb17382b630f4f32c3b')
    console.log("TCL: storeDetail", storeDetail.title)
    const storeId = storeDetail._id;
    // const storeId = '5dc4c7b2f5de187854e125b9';
    const CollectionModel = shared.CollectionModel;
    const ImageModel = shared.ImageModel;
    const ProductModel = shared.ProductModel;
    const UpdateModel = shared.UpdateModel;


    await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
    await CollectionModel.collection.deleteMany({ _id: { $exists: true } });
    await ImageModel.collection.deleteMany({ _id: { $exists: true } });
    await ProductModel.collection.deleteMany({ _id: { $exists: true } });


    // await PartnerShopify.productsCreate({ partnerStore: storeDetail.partner, shopDomain: storeDetail.partnerSpecificUrl, partnerId: '4360078557299' });
    await PartnerShopify.syncStoreData({
      "storeId": storeId,
      "partnerStore": "shopify",
      "collectionId": null
    });
    await ProductModel.updateMany({ "partnerCreatedAt": { $gte: ("2020-02-01T12:19:44.600+0000") } }, { postableIsNew: true })
    // await syncCollectionPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionType: 'custom_collections', pageInfo: null, productId: null });
    // await PartnerShopify.syncProductPage({ storeId: storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null }, context);
  }
}
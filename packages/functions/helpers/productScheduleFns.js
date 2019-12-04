const _ = require('lodash');
const shared = require('shared');

const {
  COLLECTION_OPTION_SELECTED,
  COLLECTION_OPTION_NOT_SELECTED,
  RULE_TYPE_OLD,
  RULE_TYPE_NEW,
  POSTING_SORTORDER_NEWEST
} = require('shared/constants');
module.exports = {
  getProductsForSchedule: async function (update, profileId) {
    const ProductModel = shared.ProductModel;
    // get all the products that are not shared on this profile. 
    // console.log("TCL: getProductsForSchedule profileId", profileId)
    const notSharedOnThisProfileQuery = this.getProductsQuery(update);
    // console.log("TCL: getProductsForSchedule notSharedOnThisProfileQuery", notSharedOnThisProfileQuery)
    const notSharedProductsForCount = await notSharedOnThisProfileQuery.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    // following condition. means that there are some products that are not shared on this profile. 
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(update);
      if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * notSharedProductsForCount.length)
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find({ "shareHistory.profile": { $ne: profileId } }).limit(1);
      let products = await notSharedOnThisProfileLimitQuery.populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getProductsQuery(update);
    console.log("TCL: lessSharedOnThisProfile")
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": profileId });
    console.log("TCL: update.postingProductOrder", update.postingProductOrder)
    if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const productCount = await ProductModel.countDocuments({ store: update.store, active: true });
      console.log("TCL: getProductsForSchedule productCount", productCount)
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * productCount);
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).limit(1);
    let products = await lessSharedOnThisProfile.populate('images');
    return products;
  },
  getProductsQuery: function (update) {
    const ProductModel = shared.ProductModel;
    let query;
    query = ProductModel.find({ store: update.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (update.postType == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (update.postType == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!update.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (update.postingCollectionOption === COLLECTION_OPTION_SELECTED && update.allowedCollections.length > 0) {
      query = query.where('collections').in(update.allowedCollections);
    }
    if (update.disallowedCollections.length > 0) {
      query = query.where('collections').nin(update.disallowedCollections);
    }
    return query;
  },
  getVariantsForSchedule: async function (update, profileId) {
    const VariantModel = shared.VariantModel;
    const notSharedOnThisProfile = this.getVariantsQuery(update);
    const variantsCount = await notSharedOnThisProfile.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    if (variantsCount > 0) {
      let query = this.getVariantsQuery(update);
      if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
        query = query.sort({ partnerCreatedAt: -1 })
      } else {
        const variantCount = await VariantModel.countDocuments({ store: update.store, active: true });
        query = query.limit(-1).skip(Math.random() * variantCount)
      }
      let products = await query.find({ "shareHistory.profile": { $ne: profileId } }).limit(1).populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getVariantsQuery(update);;
    if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const variantCount = await VariantModel.countDocuments({ store: update.store, active: true });
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * variantCount)
    }
    let products = await lessSharedOnThisProfile.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 }).limit(1).populate('images');
    return products;
  },
  getVariantsQuery: function (update) {
    const VariantModel = shared.VariantModel;
    let query;
    query = VariantModel.find({ store: update.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (update.postType == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (update.postType == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!update.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (update.postingCollectionOption === COLLECTION_OPTION_SELECTED && update.allowedCollections.length > 0) {
      query = query.where('collections').in(update.allowedCollections);
    }
    if (update.disallowedCollections.length > 0) {
      query = query.where('collections').nin(update.disallowedCollections);
    }
    return query;
  }
}
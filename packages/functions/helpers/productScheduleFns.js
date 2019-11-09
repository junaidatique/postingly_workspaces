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
  getProductsForSchedule: async function (ruleDetail, profileId, limit) {
    console.log("TCL: getProductsForSchedule limit", limit)
    const ProductModel = shared.ProductModel;
    // get all the products that are not shared on this profile. 
    // console.log("TCL: getProductsForSchedule profileId", profileId)
    const notSharedOnThisProfileQuery = this.getProductsQuery(ruleDetail);
    // console.log("TCL: getProductsForSchedule notSharedOnThisProfileQuery", notSharedOnThisProfileQuery)
    const notSharedProductsForCount = await notSharedOnThisProfileQuery.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    // following condition. means that there are some products that are not shared on this profile. 
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(ruleDetail);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * notSharedProductsForCount.length)
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find({ "shareHistory.profile": { $ne: profileId } }).limit(limit);
      let products = await notSharedOnThisProfileLimitQuery.populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getProductsQuery(ruleDetail);
    console.log("TCL: lessSharedOnThisProfile")
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": profileId });
    console.log("TCL: ruleDetail.postingProductOrder", ruleDetail.postingProductOrder)
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const productCount = await ProductModel.countDocuments({ store: ruleDetail.store, active: true });
      console.log("TCL: getProductsForSchedule productCount", productCount)
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * productCount);
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).limit(limit);
    let products = await lessSharedOnThisProfile.populate('images');
    return products;
  },
  getProductsQuery: function (ruleDetail) {
    const ProductModel = shared.ProductModel;
    let query;
    query = ProductModel.find({ store: ruleDetail.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED && ruleDetail.collections.length > 0) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED && ruleDetail.collections.length > 0) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    return query;
  },
  getVariantsForSchedule: async function (ruleDetail, profileId, limit) {
    const notSharedOnThisProfile = this.getVariantsQuery(ruleDetail);
    const variantsCount = await notSharedOnThisProfile.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    if (variantsCount > 0) {
      let query = this.getVariantsQuery(ruleDetail);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
        query = query.sort({ partnerCreatedAt: -1 })
      } else {
        const variantCount = await VariantModel.countDocuments({ store: ruleDetail.store, active: true });
        query = query.limit(-1).skip(Math.random() * variantCount)
      }
      let products = await query.find({ "shareHistory.profile": { $ne: profileId } }).limit(limit).populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getVariantsQuery(ruleDetail);;
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const variantCount = await VariantModel.countDocuments({ store: ruleDetail.store, active: true });
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * variantCount)
    }
    let products = await lessSharedOnThisProfile.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 }).limit(limit).populate('images');
    return products;
  },
  getVariantsQuery: function (ruleDetail) {
    const VariantModel = shared.VariantModel;
    let query;
    query = VariantModel.find({ store: ruleDetail.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    return query;
  }
}
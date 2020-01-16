const _ = require('lodash');
const shared = require('shared');
const ProductModel = shared.ProductModel;
const VariantModel = shared.VariantModel;
const {
  COLLECTION_OPTION_SELECTED,
  RULE_TYPE_OLD,
  RULE_TYPE_NEW,
  POSTING_SORTORDER_NEWEST
} = require('shared/constants');
module.exports = {
  getProductsForSchedule: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, context) {
    let products;
    products = await this.getNotSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    if (products.length === 0) {
      products = await this.getLessSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
      if (products.length === 0) {
        products = await this.getLessSharedProducts(ruleDetail, [], postingCollectionOption, allowedCollections);
      }
    }
    return products;

  },
  // get all the products that are not shared on this profile. 
  getNotSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    console.log("TCL: getNotSharedProducts")
    const profileId = ruleDetail.profile;
    const notSharedOnThisProfileQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    const notSharedProductsForCount = await notSharedOnThisProfileQuery.countDocuments(
      { "shareHistory.profile": { $ne: profileId } }
    );
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * notSharedProductsForCount.length)
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find(
        { "shareHistory.profile": { $ne: ruleDetail.profile } }
      ).limit(8);
      let products = await notSharedOnThisProfileLimitQuery;
      return products;
    } else {
      return [];
    }
  },
  getLessSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    console.log("TCL: lessSharedOnThisProfile")
    let lessSharedOnThisProfile = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": ruleDetail.profile });
    console.log("TCL: ruleDetail.postingProductOrder", ruleDetail.postingProductOrder)
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const productCount = await ProductModel.countDocuments({ store: ruleDetail.store, active: true });
      console.log("TCL: getProductsForSchedule productCount", productCount)
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * productCount);
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).limit(8);
    let products = await lessSharedOnThisProfile;
    // if (!_.isEmpty(products)) {
    //   existingScheduleItems.push(products[0]._id);
    // }
    return products;
  },
  getProductsQuery: function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    console.log("TCL: allowedCollections", allowedCollections)
    let query;
    query = ProductModel.find(
      {
        store: ruleDetail.store,
        active: true,
        postableByPrice: true,
        postableByImage: true
      }
    );
    if (!_.isEmpty(existingScheduleItems)) {
      query = query.where({ _id: { $nin: existingScheduleItems } });
    }
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
    if (postingCollectionOption === COLLECTION_OPTION_SELECTED && allowedCollections.length > 0) {
      query = query.where('collections').in(allowedCollections);
    }
    if (ruleDetail.disallowedCollections.length > 0) {
      query = query.where('collections').nin(ruleDetail.disallowedCollections);
    }
    console.log("TCL: getProductsQuery query['_conditions']", query['_conditions'])
    return query;
  },

}
const _ = require('lodash');
const shared = require('shared');
const ProductModel = shared.ProductModel;
const {
  COLLECTION_OPTION_SELECTED,
  RULE_TYPE_OLD,
  RULE_TYPE_NEW,
  POSTING_SORTORDER_NEWEST
} = require('shared/constants');
module.exports = {
  getProductsForSchedule: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts) {
    let products;
    products = await this.checkAllProductsNotShared(ruleDetail, [], postingCollectionOption, allowedCollections);
    if (products.length > 0) {
      return products;
    }
    if (ruleDetail.type === RULE_TYPE_NEW) {
      products = await this.checkNewProductsNotShared(ruleDetail, [], postingCollectionOption, allowedCollections);
      return products;
    }
    products = await this.getLessSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts);
    if (products.length === 0) {
      products = await this.getLessSharedProducts(ruleDetail, [], postingCollectionOption, allowedCollections, noOfActiveProducts);
    }

    return products;

  },

  checkAllProductsNotShared: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    return await this.getNotSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
  },
  checkNewProductsNotShared: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    return await this.getNotSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, true);
  },

  // get all the products that are not shared on this profile. 
  getNotSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, checkNewProducts = false) {
    console.log("TCL: getNotSharedProducts")
    const profileId = ruleDetail.profile;
    let notSharedOnThisProfileCountQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    if (checkNewProducts) {
      notSharedOnThisProfileCountQuery = notSharedOnThisProfileCountQuery.countDocuments(
        { "shareHistory.profile": profileId, "shareHistory.postType": { $ne: RULE_TYPE_NEW } }
      );
    } else {
      notSharedOnThisProfileCountQuery = notSharedOnThisProfileCountQuery.countDocuments(
        { "shareHistory.profile": { $ne: profileId } }
      );
    }
    console.log("TCL: getNotSharedProducts notSharedOnThisProfileCountQuery['_conditions']", notSharedOnThisProfileCountQuery['_conditions']);
    const notSharedProductsForCount = await notSharedOnThisProfileCountQuery;
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * notSharedProductsForCount.length)
      }
      if (checkNewProducts) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find(
          { "shareHistory.profile": profileId, "shareHistory.postType": { $ne: RULE_TYPE_NEW } }
        );
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find(
          { "shareHistory.profile": { $ne: profileId } }
        );
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(8);
      console.log("TCL: getNotSharedProducts notSharedOnThisProfileLimitQuery['_conditions']", notSharedOnThisProfileLimitQuery['_conditions']);
      let products = await notSharedOnThisProfileLimitQuery;
      return products;
    } else {
      return [];
    }
  },

  getLessSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts) {
    console.log("TCL: lessSharedOnThisProfile")
    let lessSharedOnThisProfile = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": ruleDetail.profile });
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * noOfActiveProducts);
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).limit(8);
    console.log("TCL: getNotSharedProducts lessSharedOnThisProfile['_conditions']", lessSharedOnThisProfile['_conditions']);
    let products = await lessSharedOnThisProfile;
    return products;
  },
  getProductsQuery: function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
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
    // console.log("TCL: getProductsQuery query['_conditions']", query['_conditions'])
    return query;
  },

}
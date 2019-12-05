const _ = require('lodash');
const shared = require('shared');
const ProductModel = shared.ProductModel;
const VariantModel = shared.VariantModel;
const {
  COLLECTION_OPTION_SELECTED,
  COLLECTION_OPTION_NOT_SELECTED,
  RULE_TYPE_OLD,
  RULE_TYPE_NEW,
  POSTING_SORTORDER_NEWEST
} = require('shared/constants');
module.exports = {
  getProductsForSchedule: async function (update, profileId, existingScheduleItems, updateIndex) {
    let products;
    let item;
    products = await this.getNotSharedProducts(update, profileId, existingScheduleItems, updateIndex);
    if (products.length === 0) {
      products = await this.getLessSharedProducts(update, profileId, existingScheduleItems, updateIndex);
      if (products.length === 0) {
        products = await this.getLessSharedProducts(update, profileId, [], updateIndex);
      }
    }
    if (products.length > 0) {
      item = products[0];
      return { item: products[0] };
    }
    return { item: undefined };

  },
  // get all the products that are not shared on this profile. 
  getNotSharedProducts: async function (update, profileId, existingScheduleItems, updateIndex) {
    console.log("TCL: getNotSharedProducts")
    const notSharedOnThisProfileQuery = this.getProductsQuery(update, existingScheduleItems);
    const notSharedProductsForCount = await notSharedOnThisProfileQuery.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(update, existingScheduleItems);
      if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * notSharedProductsForCount.length)
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find(
        { "shareHistory.profile": { $ne: profileId } }
      ).skip(updateIndex).limit(1);
      let products = await notSharedOnThisProfileLimitQuery.populate('images');
      return products;
    } else {
      return [];
    }
  },
  getLessSharedProducts: async function (update, profileId, existingScheduleItems, updateIndex) {
    console.log("TCL: lessSharedOnThisProfile")
    let lessSharedOnThisProfile = this.getProductsQuery(update, existingScheduleItems);
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": profileId });
    console.log("TCL: update.postingProductOrder", update.postingProductOrder)
    if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const productCount = await ProductModel.countDocuments({ store: update.store, active: true });
      console.log("TCL: getProductsForSchedule productCount", productCount)
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * productCount);
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).skip(updateIndex).limit(1);
    let products = await lessSharedOnThisProfile.populate('images');
    if (!_.isEmpty(products)) {
      existingScheduleItems.push(products[0]._id);
    }
    return products;
  },
  getProductsQuery: function (update, existingScheduleItems) {
    let query;
    query = ProductModel.find(
      {
        store: update.store,
        active: true,
        postableByPrice: true,
        postableByImage: true
      }
    );
    if (!_.isEmpty(existingScheduleItems)) {
      query = query.where({ _id: { $nin: existingScheduleItems } });
    }
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
  getVariantsForSchedule: async function (update, profileId, existingScheduleItems, updateIndex) {

    let varaints;
    let item;
    varaints = await this.getNotSharedVariants(update, profileId, existingScheduleItems, updateIndex);
    if (varaints.length === 0) {
      varaints = await this.getLessSharedVariants(update, profileId, existingScheduleItems, updateIndex);
      if (varaints.length === 0) {
        varaints = await this.getLessSharedVariants(update, profileId, [], updateIndex);
      }
    }
    if (varaints.length > 0) {
      item = varaints[0];
      return { item: varaints[0] };
    }
    return { item: undefined };



  },
  getNotSharedVariants: async function (update, profileId, existingScheduleItems, updateIndex) {
    const notSharedOnThisProfile = this.getVariantsQuery(update, existingScheduleItems);
    const variantsCount = await notSharedOnThisProfile.countDocuments({ "shareHistory.profile": { $ne: profileId } });
    if (variantsCount > 0) {
      let query = this.getVariantsQuery(update);
      if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
        query = query.sort({ partnerCreatedAt: -1 })
      } else {
        const variantCount = await VariantModel.countDocuments({ store: update.store, active: true });
        query = query.limit(-1).skip(Math.random() * variantCount)
      }
      let variants = await query.find({ "shareHistory.profile": { $ne: profileId } }).skip(updateIndex).limit(1).populate('images');
      return variants;
    } else {
      return [];
    }
  },
  getLessSharedVariants: async function (update, profileId, existingScheduleItems, updateIndex) {
    let lessSharedOnThisProfile = this.getVariantsQuery(update, existingScheduleItems);;
    if (update.postingProductOrder == POSTING_SORTORDER_NEWEST || update.postType == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const variantCount = await VariantModel.countDocuments({ store: update.store, active: true });
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * variantCount)
    }
    let varaints = await lessSharedOnThisProfile.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 }).skip(updateIndex).limit(1).populate('images');
    return varaints;
  },
  getVariantsQuery: function (update, existingScheduleItems) {
    let query;
    query = VariantModel.find({ store: update.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (update.postType == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (update.postType == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    if (!_.isEmpty(existingScheduleItems)) {
      query = query.where({ _id: { $nin: existingScheduleItems } });
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
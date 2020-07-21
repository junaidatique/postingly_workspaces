const ProductModel = require('shared').ProductModel;
const StoreModel = require('shared').StoreModel;
const sqsHelper = require('shared').sqsHelper;
const formattedProduct = require('./functions').formattedProduct
const formattedStore = require('../Store/functions').formattedStore
const PartnerShopify = require('shared').PartnerShopify;
const _ = require('lodash')
const {
  PARTNERS_SHOPIFY,
  PRODUCT_SORT_TITLE_ASC,
  PRODUCT_SORT_TITLE_DESC,
  PRODUCT_SORT_CREATED_ASC,
  PRODUCT_SORT_CREATED_DESC,
  PRODUCT_SORT_UPDATED_ASC,
  PRODUCT_SORT_UPDATED_DESC,
  PRODUCT_SORT_SCHEDULED_ASC,
  PRODUCT_SORT_SCHEDULED_DESC
} = require('shared/constants');


module.exports = {
  listProducts: async (obj, args, context, info) => {
    console.log("listProducts args", args)
    let searchQuery = {
      store: args.filter.storeId,
    }
    if (!_.isEmpty(args.filter.title)) {
      searchQuery.title = new RegExp(args.filter.title, "i")
    }
    if (!_.isNull(args.filter.profile) && !_.isUndefined(args.filter.profile)) {
      if (args.filter.scheduledOnProfile === 'yes') {
        searchQuery["shareHistory.profile"] = args.filter.profile
      } else if (args.filter.scheduledOnProfile === 'no') {
        searchQuery["shareHistory.profile"] = { $ne: args.filter.profile }
      }
    }
    if (args.filter.postableIsNew === 'yes') {
      searchQuery["postableIsNew"] = true;
    } else if (args.filter.postableIsNew === 'no') {
      searchQuery["postableIsNew"] = false;
    }
    if (args.filter.postableByPrice === 'yes') {
      searchQuery["postableByPrice"] = true;
    } else if (args.filter.postableByPrice === 'no') {
      searchQuery["postableByPrice"] = false;
    }
    if (args.filter.postableByImage === 'yes') {
      searchQuery["postableByImage"] = true;
    } else if (args.filter.postableByImage === 'no') {
      searchQuery["postableByImage"] = false;
    }
    if (args.filter.postableByQuantity === 'yes') {
      searchQuery["postableByQuantity"] = true;
    } else if (args.filter.postableByQuantity === 'no') {
      searchQuery["postableByQuantity"] = false;
    }
    if (args.filter.active === 'yes') {
      searchQuery["postableByQuantity"] = true;
    } else if (args.filter.active === 'no') {
      searchQuery["active"] = false;
    }

    if (!_.isEmpty(args.filter.collections)) {
      searchQuery.collections = { $in: args.filter.collections }
    }
    let sortOrder;
    switch (args.sort) {
      case PRODUCT_SORT_TITLE_ASC:
        sortOrder = { title: 1 };
        break;
      case PRODUCT_SORT_TITLE_DESC:
        sortOrder = { title: -1 };
        break;
      case PRODUCT_SORT_CREATED_ASC:
        sortOrder = { partnerCreatedAt: 1 };
        break;
      case PRODUCT_SORT_CREATED_DESC:
        sortOrder = { partnerCreatedAt: -1 };
        break;
      case PRODUCT_SORT_UPDATED_ASC:
        sortOrder = { partnerUpdatedAt: 1 };
        break;
      case PRODUCT_SORT_UPDATED_DESC:
        sortOrder = { partnerUpdatedAt: -1 };
        break;
      case PRODUCT_SORT_SCHEDULED_ASC:
        sortOrder = { "shareHistory.counter": 1 };
        break;
      case PRODUCT_SORT_SCHEDULED_DESC:
        sortOrder = { "shareHistory.counter": -1 };
        break;
      default:
        sortOrder = { createdAt: 1 };
    }


    const searchOptions = {
      sort: sortOrder,
      offset: args.skip,
      limit: args.limit
    }
    const products = await ProductModel.paginate(searchQuery, searchOptions);
    console.log("products.total", products.total)
    const productList = products.docs.map(product => {
      return formattedProduct(product);
    });
    return {
      products: productList,
      totalRecords: products.total
    }

  },
  syncProducts: async (obj, args, context, info) => {
    console.log("syncProducts args", args)
    const storeDetail = await StoreModel.findById(args.storeId);
    if (process.env.IS_OFFLINE === 'no') {
      const storePayload = {
        "storeId": args.storeId,
        "partnerStore": storeDetail.partner,
        "collectionId": null
      }
      await sqsHelper.addToQueue('SyncStoreData', storePayload);
    } else {
      await PartnerShopify.syncStoreData({ storeId: storeDetail._id, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
    }
    const storeResult = formattedStore(storeDetail);
    return storeResult;

  }
}
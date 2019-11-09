const ProductModel = require('shared').ProductModel;
const StoreModel = require('shared').StoreModel;
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
let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}

module.exports = {
  listProducts: async (obj, args, context, info) => {
    try {
      let searchQuery = {
        store: args.filter.storeId,
      }
      if (!_.isEmpty(args.filter.title)) {
        searchQuery.title = new RegExp(args.filter.title, "i")
      }
      if (!_.isNull(args.filter.profile) && !_.isUndefined(args.filter.profile)) {
        if (args.filter.scheduledOnProfile) {
          searchQuery["shareHistory.profile"] = args.filter.profile
        } else {
          searchQuery["shareHistory.profile"] = { $ne: args.filter.profile }
        }
      }
      if (!_.isUndefined(args.filter.postableIsNew)) {
        searchQuery["postableIsNew"] = args.filter.postableIsNew;
      }
      if (!_.isUndefined(args.filter.postableByPrice)) {
        searchQuery["postableByPrice"] = args.filter.postableByPrice;
      }
      if (!_.isUndefined(args.filter.postableByImage)) {
        searchQuery["postableByImage"] = args.filter.postableByImage;
      }
      if (!_.isUndefined(args.filter.postableByQuantity)) {
        searchQuery["postableByQuantity"] = args.filter.postableByQuantity;
      }
      if (!_.isUndefined(args.filter.active)) {
        searchQuery["active"] = args.filter.active;
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
      console.log("TCL: searchQuery", searchQuery)
      const products = await ProductModel.paginate(searchQuery, searchOptions);
      const productList = products.docs.map(product => {
        return formattedProduct(product);
      });
      return {
        products: productList,
        totalRecords: products.total
      }
    } catch (error) {
      throw error;
    }
  },
  syncProducts: async (obj, args, context, info) => {
    try {
      const storeDetail = await StoreModel.findById(args.storeId);
      if (process.env.IS_OFFLINE === 'false') {
        const storePayload = {
          "storeId": args.storeId,
          "partnerStore": storeDetail.partner,
          "collectionId": null
        }
        const QueueUrl = `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_USER_ID}/${process.env.STAGE}SyncStoreData`;
        console.log("TCL: QueueUrl", QueueUrl)
        const params = {
          MessageBody: JSON.stringify(storePayload),
          QueueUrl: QueueUrl
        };
        console.log("TCL: params", params)
        const response = await sqs.sendMessage(params).promise();
        console.log("TCL: response", response)
      } else {
        // console.log("TCL: storeDetail", storeDetail)
        await PartnerShopify.syncProductPage({ storeId: storeDetail._id, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
        await PartnerShopify.syncVariantPage({ storeId: storeDetail._id, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
      }
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
  }
}
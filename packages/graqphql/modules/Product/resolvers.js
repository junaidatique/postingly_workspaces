const ProductModel = require('shared').ProductModel;
const StoreModel = require('shared').StoreModel;
const formattedProduct = require('./functions').formattedProduct
const formattedStore = require('../Store/functions').formattedStore
const PartnerShopify = require('shared').PartnerShopify;
const _ = require('lodash')
const { PARTNERS_SHOPIFY } = require('shared/constants');
let lambda;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
}

module.exports = {
  listProducts: async (obj, args, context, info) => {
    try {
      let searchQuery = {
        store: args.filter.storeId,
      }
      if (!_.isEmpty(args.filter.title)) {
        searchQuery = {
          store: args.filter.storeId,
          title: new RegExp(args.filter.title, "i")
        }
      }
      let sortOrder = { createdAt: -1 };
      if (!_.isEmpty(args.sort)) {
        if (args.sort === 'title_ASC') {
          sortOrder = { title: 1 };
        }
        else if (args.sort === 'title_DESC') {
          sortOrder = { title: -1 };
        }
      }
      const searchOptions = {
        sort: sortOrder,
        offset: args.skip,
        limit: args.limit
      }
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
        const syncStoreDataParams = {
          FunctionName: `postingly-functions-${process.env.STAGE}-sync-store-data`,
          InvocationType: 'Event',
          LogType: 'Tail',
          Payload: JSON.stringify(storePayload)
        };
        console.log("TCL: lambda.invoke syncStoreDataParams", syncStoreDataParams)

        const syncStoreDataLambdaResponse = await lambda.invoke(syncStoreDataParams).promise();
        console.log("TCL: syncStoreDataLambdaResponse", syncStoreDataLambdaResponse)
      } else {
        // console.log("TCL: storeDetail", storeDetail)
        await PartnerShopify.syncProductPage({ storeId: storeDetail._id, partnerStore: PARTNERS_SHOPIFY, collectionId: null, pageInfo: null });
      }
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
  }
}
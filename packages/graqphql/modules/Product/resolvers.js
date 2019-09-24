const ProductModel = require('shared').ProductModel;
const StoreModel = require('shared').StoreModel;
const formattedProduct = require('./functions').formattedProduct
const formattedStore = require('../Store/functions').formattedStore
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
      const searchQuery = {
        store: args.filter.storeId,
      }
      const searchOptions = {
        sort: { createdAt: -1 },
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
      }
      const storeResult = formattedStore(storeDetail);
      return storeResult;
    } catch (error) {
      throw error;
    }
  }
}
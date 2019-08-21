const ProductModel = require('shared').ProductModel;
const formattedProduct = require('./functions').formattedProduct
const query = require('shared').query;


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
  }
}
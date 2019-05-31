const ProductModel = require('shared').ProductModel;
const formattedProduct = require('./functions').formattedProduct
const query = require('shared').query;


module.exports = {
  listProducts: async (obj, args, context, info) => {
    try {
      const searchQuery = query.createSearchQuery(ProductModel, args);
      const products = await searchQuery;
      return products.map(product => {
        return formattedProduct(product);
      })
    } catch (error) {
      throw error;
    }
  }
}
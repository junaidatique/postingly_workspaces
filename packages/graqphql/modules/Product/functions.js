const storeFunctions = require('../Store/functions');
const ProductModel = require('shared').ProductModel;
const formattedProduct = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store)
  }
}
const getProductById = async productId => {
  const productDetail = await ProductModel.findOne(productId);
  if (storeDetail === null) {
    throw new UserInputError('product not found.');
  }
  return formattedProduct(productDetail)
}
exports.formattedProduct = formattedProduct
exports.getProductById = getProductById
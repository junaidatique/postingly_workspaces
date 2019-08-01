const storeFunctions = require('../Store/functions');
const imageFunctions = require('../Image/functions');
const ProductModel = require('shared').ProductModel;
const formattedProduct = async (product) => {
  return {
    ...product._doc,
    id: product._id,
    partnerCreatedAt: (product.partnerCreatedAt !== undefined) ? product.partnerCreatedAt : null,
    store: storeFunctions.getStoreByID.bind(this, product._doc.store),
    images: imageFunctions.getProductImages.bind(this, product._id)
  }
}
const getProductById = async (productId) => {
  const productDetail = await ProductModel.findOne(productId);
  if (productDetail === null) {
    throw new UserInputError('product not found.');
  }
  return formattedProduct(productDetail)
}
exports.formattedProduct = formattedProduct
exports.getProductById = getProductById
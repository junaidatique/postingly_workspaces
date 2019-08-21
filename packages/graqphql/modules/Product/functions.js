const storeFunctions = require('../Store/functions');
const imageFunctions = require('../Image/functions');
const ProductModel = require('shared').ProductModel;
const VariantModel = require('shared').VariantModel;
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
const formattedVariant = async (variant) => {
  return {
    ...variant._doc,
    id: variant._id,
    partnerCreatedAt: (variant.partnerCreatedAt !== undefined) ? variant.partnerCreatedAt : null,
    store: storeFunctions.getStoreByID.bind(this, variant._doc.store),
    images: imageFunctions.getProductImages.bind(this, variant._id),
    product: getProductById.bind(this, variant.product)
  }
}
const getVariantById = async (variantId) => {
  const variantDetail = await VariantModel.findOne(variantId);
  if (variantDetail === null) {
    throw new UserInputError('variant not found.');
  }
  return formattedVariant(variantDetail)
}
exports.formattedProduct = formattedProduct
exports.getProductById = getProductById
exports.getVariantById = getVariantById
const storeFunctions = require('../Store/functions');
const imageFunctions = require('../Image/functions');
const ProductModel = require('shared').ProductModel;
const _ = require('lodash');
const formattedProduct = async (product) => {
  return {
    ...product._doc,
    id: product._id,
    partnerCreatedAt: (product.partnerCreatedAt !== undefined) ? product.partnerCreatedAt : null,
    store: storeFunctions.getStoreByID.bind(this, product._doc.store),
    images: imageFunctions.getProductImages.bind(this, product.imagesList),
    variants: formattedVariant.bind(this, product.variants),
    minimumPrice: product.minimumPrice.toString()
  }
}
const getProducts = async productIds => {
  products = await ProductModel.find({ _id: { $in: productIds } });
  console.log("getProducts products", products.map(p => p.title))
  const response = products.map((product) => {
    return formattedProduct(product)
  }).filter(function (item) {
    return !_.isUndefined(item);
  });
  return response;
}
const getProductById = async (productId) => {
  const productDetail = await ProductModel.findOne(productId);
  if (productDetail === null) {
    // throw new UserInputError('product not found.');
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

exports.formattedProduct = formattedProduct
exports.getProductById = getProductById
exports.getProducts = getProducts

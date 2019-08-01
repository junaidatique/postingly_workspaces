const ImageModel = require('shared').ImageModel;
const formattedImage = async (image) => {
  return {
    ...image._doc,
    id: image._id,
  }
}
const getProductImages = async productId => {
  const images = await ImageModel.find({ product: productId });
  return images.map(image => {
    return formattedImage(image)
  });
}
exports.formattedImage = formattedImage;;
exports.getProductImages = getProductImages;;
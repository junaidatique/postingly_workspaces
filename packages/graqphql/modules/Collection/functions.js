const storeFunctions = require('../Store/functions');
const CollectionModel = require('shared').CollectionModel;
const formattedCollection = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store)
  }
}
const getCollectionById = async collectionId => {
  const collectionDetail = await CollectionModel.findOne(collectionId);
  if (storeDetail === null) {
    throw new UserInputError('collection not found.');
  }
  return formattedCollection(collectionDetail)
}
exports.formattedCollection = formattedCollection;;
exports.getCollectionById = getCollectionById
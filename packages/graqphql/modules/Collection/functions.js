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
  if (collectionDetail === null) {
    throw new UserInputError('collection not found.');
  }
  return formattedCollection(collectionDetail)
}
const getCollections = async collectionIds => {
  const collections = await CollectionModel.find({ _id: { $in: collectionIds } });
  return collections.map(collection => {
    return formattedCollection(collection)
  });
}
exports.formattedCollection = formattedCollection;;
exports.getCollectionById = getCollectionById
exports.getCollections = getCollections
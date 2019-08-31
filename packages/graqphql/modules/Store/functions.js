const StoreModel = require('shared').StoreModel;
const profileFuns = require('../Profile/functions');

const formattedStore = (store) => {
  return {
    ...store._doc,
    id: store._id,
    partnerCreatedAt: store.partnerCreatedAt,
    createdAt: (store.createdAt !== undefined) ? store.createdAt.toISOString() : null,
    partnerUpdatedAt: store.partnerUpdatedAt,
    productsLastUpdated: store.productsLastUpdated,
    chargeDate: store.chargeDate,
    // profiles: (store._doc.profiles.count > 0) ? profileFuns.getProfiles.bind(this, store._doc.profiles) : []
    profiles: profileFuns.getProfiles.bind(this, store._doc.profiles)
  }
}
const getStoreByUniqKey = async (uniqKey) => {
  const storeDetail = await StoreModel.findOne({ uniqKey: uniqKey });
  if (storeDetail === null) {
    throw new Error('Store not found.');
  }
  return formattedStore(storeDetail)
}
const getStoreByID = async (storeId) => {
  const storeDetail = await StoreModel.findById(storeId);
  console.log("TCL: getStoreByID -> storeDetail", storeDetail)
  if (storeDetail === null) {
    throw new Error('Store not found.');
  }
  return formattedStore(storeDetail)
}

exports.formattedStore = formattedStore
exports.getStoreByUniqKey = getStoreByUniqKey
exports.getStoreByID = getStoreByID
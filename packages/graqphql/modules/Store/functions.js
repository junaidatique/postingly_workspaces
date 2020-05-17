const StoreModel = require('shared').StoreModel;
const profileFunc = require('../Profile/functions');
const ruleFunc = require('../Rule/functions');

const formattedStore = (store) => {
  return {
    ...store._doc,
    id: store._id,
    partnerCreatedAt: store.partnerCreatedAt,
    createdAt: (store.createdAt !== undefined) ? store.createdAt.toISOString() : null,
    updatedAt: (store.updatedAt !== undefined) ? store.updatedAt.toISOString() : null,
    partnerUpdatedAt: store.partnerUpdatedAt,
    productsLastUpdated: store.productsLastUpdated,
    chargeDate: store.chargeDate,
    // profiles: (store._doc.profiles.count > 0) ? profileFuns.getProfiles.bind(this, store._doc.profiles) : []
    profiles: profileFunc.getProfiles.bind(this, store._doc.profiles),
    rules: ruleFunc.getRules.bind(this, store._doc.rules)
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
  if (storeDetail === null) {
    throw new Error('Store not found.');
  }
  return formattedStore(storeDetail)
}

exports.formattedStore = formattedStore
exports.getStoreByUniqKey = getStoreByUniqKey
exports.getStoreByID = getStoreByID
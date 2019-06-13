const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const ruleFunctions = require('../Rule/functions');
const productFunctions = require('../Product/functions');
const formattedUpdate = async (update) => {
  return {
    ...update._doc,
    id: update._id,
    store: storeFunctions.getStoreByID.bind(this, update._doc.store),
    profile: profileFunctions.getProfileById.bind(this, update._doc.profile),
    rule: ruleFunctions.getRuleById.bind(this, update._doc.rule),
    product: productFunctions.getProductById.bind(this, update._doc.product),
  }
}
exports.formattedUpdate = formattedUpdate
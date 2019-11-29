const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const ruleFunctions = require('../Rule/functions');
const productFunctions = require('../Product/functions');
const moment = require('moment');
const formattedUpdate = async (update) => {
  return {
    ...update._doc,
    id: update._id,
    store: storeFunctions.getStoreByID.bind(this, update._doc.store),
    profile: profileFunctions.getProfileById.bind(this, update._doc.profile),
    rule: ruleFunctions.getRuleById.bind(this, update._doc.rule),
    product: productFunctions.getProductById.bind(this, update._doc.product),
    variant: productFunctions.getVariantById.bind(this, update._doc.variant),
    scheduleTime: (update.scheduleTime !== undefined) ? moment(update.scheduleTime).toISOString() : null,
    createdAt: (update.createdAt !== undefined) ? moment(update.createdAt).toISOString() : null,
    updatedAt: (update.updatedAt !== undefined) ? moment(update.updatedAt).toISOString() : null,
  }
}
exports.formattedUpdate = formattedUpdate
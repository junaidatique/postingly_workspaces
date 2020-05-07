const UpdateModel = require('shared').UpdateModel;
const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const ruleFunctions = require('../Rule/functions');
const productFunctions = require('../Product/functions');
const moment = require('moment');
const { PENDING, APPROVED, POSTED, FAILED } = require('shared/constants')
const formattedUpdate = async (update) => {
  return {
    ...update._doc,
    id: update._id,
    store: storeFunctions.getStoreByID.bind(this, update._doc.store),
    profile: profileFunctions.getProfileById.bind(this, update._doc.profile),
    rule: ruleFunctions.getRuleById.bind(this, update._doc.rule),
    product: productFunctions.getProductById.bind(this, update._doc.product),
    scheduleTime: (update.scheduleTime !== undefined) ? moment(update.scheduleTime).toISOString() : null,
    createdAt: (update.createdAt !== undefined) ? moment(update.createdAt).toISOString() : null,
    updatedAt: (update.updatedAt !== undefined) ? moment(update.updatedAt).toISOString() : null,
  }
}

const getScheduledUpdatesCountByProfileId = async profileId => {
  const query = {
    profile: profileId,
    status: { $in: [PENDING, APPROVED] }
  };
  console.log("getScheduledUpdatesCountByProfileId query", query)
  return await UpdateModel.countDocuments(query);
}
const getPostedUpdatesCountByProfileId = async profileId => {
  const query = {
    profile: profileId,
    status: POSTED,
    scheduleTime: { $gt: moment().subtract(1, 'day') }
  }
  console.log("getPostedUpdatesCountByProfileId query", query)
  return await UpdateModel.countDocuments(query);
}

exports.formattedUpdate = formattedUpdate
exports.getScheduledUpdatesCountByProfileId = getScheduledUpdatesCountByProfileId
exports.getPostedUpdatesCountByProfileId = getPostedUpdatesCountByProfileId
// exports.getUpdatesCount = getUpdatesCount
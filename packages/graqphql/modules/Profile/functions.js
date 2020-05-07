const ProfileModel = require('shared').ProfileModel;
const storeFunctions = require('../Store/functions');
const updateFunctions = require('../Update/functions');

const moment = require('moment')
const _ = require('lodash')
const formattedProfile = async (profile) => {
  if (!_.isNull(profile)) {
    return {
      ...profile._doc,
      id: profile._id,
      parent: getProfileById.bind(this, profile._doc.parent),
      children: getProfiles.bind(this, profile._doc.children),
      store: storeFunctions.getStoreByID.bind(this, profile._doc.store),
      createdAt: (profile.createdAt !== undefined) ? profile.createdAt.toISOString() : null,
      numberOfUpdatesScheduled: await updateFunctions.getScheduledUpdatesCountByProfileId.bind(this, profile._id),
      numberOfUpdatesScheduled: await updateFunctions.getPostedUpdatesCountByProfileId.bind(this, profile._doc._id),
      // numberOfUpdatesScheduled: await updateFunctions.getUpdatesCount.bind(this, {
      //   profile: profile._id,
      //   status: FAILED,
      //   scheduleTime: { $gt: moment().subtract(1, 'day') }
      // })
    }
  } else {
    return undefined;
  }
}
const getProfileById = async profileId => {
  const profileDetail = await ProfileModel.findOne(profileId);
  if (profileDetail === null) {
    throw new Error('Profile not found.');
  }
  return formattedProfile(profileDetail)
}
const getProfiles = async profileIds => {
  profiles = await ProfileModel.find({ _id: { $in: profileIds } });
  return profiles.map(profile => {
    return formattedProfile(profile)
  }).filter(function (item) {
    return !_.isUndefined(item);
  });
}

exports.formattedProfile = formattedProfile
exports.getProfileById = getProfileById
exports.getProfiles = getProfiles
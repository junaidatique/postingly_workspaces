const ProfileModel = require('shared').ProfileModel;
const storeFunctions = require('../Store/functions');
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
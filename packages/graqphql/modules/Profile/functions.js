const ProfileModel = require('shared').ProfileModel;
const UserInputError = require('apollo-server-express').UserInputError;
const storeFunctions = require('../Store/functions');
const formattedProfile = async (profile) => {
  return {
    ...profile._doc,
    id: profile._id,
    store: storeFunctions.getStoreByID.bind(this, profile._doc.store)
  }
}
const getProfileById = async profileId => {
  const profileDetail = await ProfileModel.findOne(profileId);
  if (storeDetail === null) {
    throw new UserInputError('Profile not found.');
  }
  return formattedProfile(profileDetail)
}
const getProfiles = async profileIds => {
  profiles = await ProfileModel.find({ _id: { $in: profileIds } });
  return profiles.map(profile => {
    return formattedProfile(profile)
  });
}

exports.formattedProfile = formattedProfile
exports.getProfileById = getProfileById
exports.getProfiles = getProfiles
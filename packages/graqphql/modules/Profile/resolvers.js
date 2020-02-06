const shared = require('shared');
const fetch = require('node-fetch');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const moment = require('moment')
const {
  FACEBOOK_SERVICE, TEST, TWITTER_SERVICE, BUFFER_SERVICE,
  PARTNERS_SHOPIFY,
  LINK_SHORTNER_SERVICES_POOOST,
  FACEBOOK_PROFILE,
  FACEBOOK_PAGE,
  TWITTER_PROFILE,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_FACEBOOK_GROUP,
  BUFFER_TWITTER_PROFILE,
  BUFFER_LINKEDIN_PROFILE,
  BUFFER_LINKEDIN_PAGE,
  BUFFER_LINKEDIN_GROUP,
  BUFFER_INSTAGRAM_PROFILE,
  BUFFER_INSTAGRAM_BUSINESS,
} = require('shared/constants');
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const _ = require('lodash')
const profileFns = require('shared').profileFns;
const formattedStore = require('../Store/functions').formattedStore
module.exports = {
  connectProfile: async (obj, args, context, info) => {
    try {
      if (args.input.service === FACEBOOK_SERVICE) {
        if (process.env.STAGE == TEST) {
          response = await FacebookService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
        } else {
          response = await FacebookService.login(args.input.storeId, args.input.code, args.input.serviceProfile);

        }
      } else if (args.input.service === TWITTER_SERVICE && !_.isNull(args.input.oauthToken)) {
        response = await TwitterService.getProfile(args.input.storeId, args.input.oauthToken, args.input.oauthRequestTokenSecret, args.input.oauthVerifier);
      } else if (args.input.service === BUFFER_SERVICE) {
        response = await BufferService.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
      }
      return response;
    } catch (error) {
      throw error;
    }

  },
  listProfiles: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      let query = ProfileModel.find({ store: args.storeId, service: args.service });
      if (args.isConnected === true) {
        query = query.where({ isConnected: true });
      } else {
        if (args.service !== TWITTER_SERVICE) {
          query = query.where('isConnected').ne(true);
        }
      }
      if (!_.isUndefined(args.isTokenExpired)) {
        if (args.isTokenExpired === true) {
          query = query.where({ isTokenExpired: true });
        } else {
          query = query.where('isTokenExpired').ne(true);
        }

      }
      query = query.where('isSharePossible').equals(true);
      if ((!_.isUndefined(args.parent) && !_.isNull(args.parent)) && args.service !== TWITTER_SERVICE) {
        query = query.where('parent').equals(args.parent);
      }
      // console.log("TCL: query", query)
      const profiles = await query;
      // console.log("TCL: profiles", profiles);
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  updateProfile: async (obj, args, context, info) => {
    try {
      let res;
      console.log("TCL: updateProfile args", args)
      if (!_.isEmpty(args)) {
        console.log("TCL: updateProfile args.input", args.input)
        await Promise.all(args.input.map(async value => {
          // _.each(args.input, async (value, key) => {
          if (value.isConnected) {
            console.log("TCL: updateProfile value", value)
            res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
            console.log("TCL: updateProfile res", res)
          }
        }));
      }
      const profiles = await ProfileModel.where('store').eq(args.storeId);
      connectedProfiles = profiles.map(profile => {
        if (profile.isConnected && profile.isSharePossible) {
          return profile;
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item));
      const storeDetail = await StoreModel.findById(args.storeId);
      storeDetail.numberOfConnectedProfiles = connectedProfiles.length;
      await storeDetail.save();
      console.log("TCL: connectedProfiles", connectedProfiles);

      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  deleteProfile: async (obj, args, context, info) => {
    console.log("TCL: deleteProfile args", args)
    try {
      let res;
      profileDetail = await ProfileModel.findById(args.profileId);
      await profileFns.deleteProfile(profileDetail);
      const profiles = await ProfileModel.where('store').eq(profileDetail.store);
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },

  createProfile: async function (storeId, profile, parentId) {
    const ProfileModel = shared.ProfileModel;
    let profileService = '';
    let profileServiceProfile = '';
    let isSharePossible = true;
    if (profile.service === 'fb') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PROFILE;
      isSharePossible = false;
    }
    if (profile.service === 'fb_page') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PAGE;
    }
    if (profile.service === 'tw') {
      profileService = TWITTER_SERVICE;
      profileServiceProfile = TWITTER_PROFILE;
    }
    if (profile.service === 'buffer') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_PROFILE;
      isSharePossible = false;
    }
    if (profile.service === 'twitter_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_TWITTER_PROFILE;
    }
    if (profile.service === 'facebook_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PROFILE;
    }
    if (profile.service === 'facebook_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PAGE;
    }
    if (profile.service === 'facebook_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_GROUP;
    }
    if (profile.service === 'linkedin_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PROFILE;
    }
    if (profile.service === 'linkedin_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PAGE;
    }
    if (profile.service === 'linkedin_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_GROUP;
    }
    if (profile.service === 'instagram_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_PROFILE;
    }
    if (profile.service === 'instagram_business') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_BUSINESS;
    }
    const uniqKey = `${profileServiceProfile}-${storeId}-${profile.serviceUserId}`;
    const dbProfile = {
      updateOne: {
        filter: { uniqKey: uniqKey },
        update: {
          store: storeId,
          parent: (!_.isNull(parentId) ? parentId._id : null),
          name: profile.name,
          uniqKey: uniqKey,
          avatarUrl: profile.avatarUrl,
          serviceUserId: profile.serviceUserId,
          serviceUsername: profile.serviceUsername,
          profileURL: profile.profileURL,
          accessToken: profile.accessToken,
          accessTokenSecret: profile.accessTokenSecret,
          service: profileService,
          serviceProfile: profileServiceProfile,
          bufferId: profile.bufferId,
          isConnected: (profile.isConnected === '0') ? false : true,
          isTokenExpired: (profile.isTokenExpired === '0') ? false : true,
          isSharePossible: isSharePossible,
          fbDefaultAlbum: profile.fbDefaultAlbum,
        },
        upsert: true
      }
    }
    console.log('===================');
    console.log("TCL: dbProfile", dbProfile)
    console.log('===================');
    return dbProfile;
  }
}
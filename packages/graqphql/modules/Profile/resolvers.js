const shared = require('shared');
const fetch = require('node-fetch');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const moment = require('moment')
const {
  FACEBOOK_SERVICE, TEST, TWITTER_SERVICE, BUFFER_SERVICE,
  PARTNERS_SHOPIFY,
  LINK_SHORTENER_SERVICES_POOOST,
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
        query = query.find({ 'parent': args.parent, serviceProfile: { $nin: [BUFFER_FACEBOOK_PROFILE, BUFFER_FACEBOOK_PAGE, BUFFER_TWITTER_PROFILE] } });
      }

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


}
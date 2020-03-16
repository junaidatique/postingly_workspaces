const shared = require('shared');
const fetch = require('node-fetch');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const moment = require('moment')
const updateClass = require('shared').updateClass;
const {
  FACEBOOK_SERVICE, TEST, TWITTER_SERVICE, BUFFER_SERVICE,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_TWITTER_PROFILE,
  RULE_TYPE_NEW,
  RULE_TYPE_OLD,
  RULE_TYPE_MANUAL

} = require('shared/constants');
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const RuleModel = require('shared').RuleModel;
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
  updateConnectProfile: async (obj, args, context, info) => {
    try {
      let res;
      console.log("TCL: updateConnectProfile args", args)
      if (!_.isEmpty(args)) {
        console.log("TCL: updateConnectProfile args.input", args.input)
        await Promise.all(args.input.map(async value => {
          // _.each(args.input, async (value, key) => {
          if (value.isConnected) {
            console.log("TCL: updateConnectProfile value", value)
            res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
            console.log("TCL: updateConnectProfile res", res)
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
  updateProfile: async (obj, args, context, info) => {
    try {
      console.log("TCL: updateProfile args", args)
      let updateData = {}
      if (!_.isUndefined(args.input.isTokenExpired)) {
        updateData['isTokenExpired'] = args.input.isTokenExpired;
      }
      if (!_.isUndefined(args.input.isConnected)) {
        updateData['isConnected'] = args.input.isConnected;
      }
      if (!_.isEmpty(updateData)) {
        await ProfileModel.updateOne({ _id: args.profileId }, updateData);
      }
      const profileDetail = await ProfileModel.findById(args.profileId);
      if (profileDetail.isTokenExpired) {
        await RuleModel.update({ profile: args.profileId }, { active: false });
        const oldProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_OLD });
        await updateClass.deleteScheduledUpdates(oldProductRule._id)
        const newProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_NEW });
        await updateClass.deleteScheduledUpdates(newProductRule._id)
        const manualProductRule = await RuleModel.findOne({ profile: args.profileId, type: RULE_TYPE_MANUAL });
        await updateClass.deleteScheduledUpdates(manualProductRule._id)
      }
      return formattedProfile(profileDetail);
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
  getBufferUpdates: async (obj, args, context, info) => {
    console.log("args", args)
    try {
      const response = await BufferService.getUpdates(args.profileId, args.status);
      return response;
    } catch (error) {
      throw error;
    }
  },
  deleteBufferUpdate: async (obj, args, context, info) => {
    console.log("args", args)
    try {
      const response = await BufferService.deleteUpdate(args.profileId, args.updateId);
      return response;
    } catch (error) {
      throw error;
    }
  },



}
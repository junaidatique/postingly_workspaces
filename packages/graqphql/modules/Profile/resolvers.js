const fbConnect = require('shared').FacebookService;
const { FACEBOOK_SERVICE, TEST } = require('shared/constants');
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const _ = require('lodash')
const profileFns = require('shared').profileFns;
module.exports = {
  connectProfile: async (obj, args, context, info) => {
    try {
      if (args.input.service === FACEBOOK_SERVICE) {
        if (process.env.STAGE == TEST) {
          response = await fbConnect.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
        } else {
          response = await fbConnect.login(args.input.storeId, args.input.code, args.input.serviceProfile);

        }
      } else {

      }
      return response;
    } catch (error) {
      throw error;
    }

  },
  listProfiles: async (obj, args, context, info) => {
    try {
      let query = ProfileModel.find({ store: args.storeId, service: args.service });
      if (args.isConnected === true) {
        query = query.where({ isConnected: true });
      } else {
        query = query.where('isConnected').ne(true);
      }
      query = query.where('isSharePossible').equals(true);
      if (!_.isUndefined(args.parent) && !_.isNull(args.parent)) {
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

      if (!_.isEmpty(args)) {
        _.each(args.input, async (value, key) => {
          res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
        });
      }
      const profileIds = args.input.map(profile => {
        return profile.id
      });
      const profiles = await ProfileModel.where('store').eq(args.storeId);
      const connectedProfiles = await ProfileModel.where('store').equals(profiles[0].store).where('isConnected').equals(true);
      const storeDetail = await StoreModel.findById(profiles[0].store);
      storeDetail.numberOfConnectedProfiles = connectedProfiles.length;
      await storeDetail.save();
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {
      throw error;
    }
  },
  deleteProfile: async (obj, args, context, info) => {
    console.log("TCL: args", args)
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
  }
}
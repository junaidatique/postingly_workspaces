const fbConnect = require('./services/facebook');
const { FACEBOOK_SERVICE, TEST } = require("../../constants");
const formattedProfile = require('./functions').formattedProfile;
const ProfileModel = require('shared').ProfileModel;
const _ = require('lodash')

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
      return response.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {

    }

  },
  listProfiles: async (obj, args, context, info) => {
    try {
      let query = ProfileModel.find({ store: args.storeId, service: args.service });
      if (args.isConnected === true) {
        query = query.where({ isConnected: true });
      } else {
        query = query.where({ isConnected: false });
      }
      const profiles = await query;
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
          console.log({ id: value.id });
          console.log({ isConnected: value.isConnected });
          res = await ProfileModel.updateOne({ _id: value.id }, { isConnected: value.isConnected });
          console.log(res);
        });
      }
      const profileIds = args.input.map(profile => {
        return profile.id
      });
      const profiles = await ProfileModel.where('_id').in(profileIds);
      return profiles.map(profile => {
        return formattedProfile(profile);
      })
    } catch (error) {

    }

  }
}
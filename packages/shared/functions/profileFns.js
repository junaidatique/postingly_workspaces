const ProfileModel = require('../models/profile');
const UpdateModel = require('../models/update');
const StoreModel = require('../models/store');
const RuleModel = require('../models/rule');
const _ = require('lodash')
module.exports = {
  deleteProfile: async function (profileDetail) {
    try {
      const deletedUpdates = await UpdateModel.deleteMany({ profile: profileDetail._id });
      const rules = await RuleModel.find({ store: profileDetail.store, service: profileDetail.service });
      if (rules.length > 0) {
        await Promise.all(rules.map(async rule => {
          const ruleProfiles = rule.profiles.map(profile => {
            if (profile !== profileDetail._id) {
              return profile;
            }
          }).filter(function (item) {
            return !_.isUndefined(item);
          });
          rule.profiles = ruleProfiles;
          await rule.save();
        }));
      }
      const connectedProfiles = await ProfileModel.where('store').equals(profiles[0].store).where('isConnected').equals(true);
      const storeDetail = await StoreModel.findById(profileDetail.store);
      storeDetail.numberOfConnectedProfiles = connectedProfiles.length;
      await storeDetail.save();
      res = await ProfileModel.updateOne({ _id: profileDetail._id }, { isConnected: false });
    } catch (error) {
      throw error;

    }

  }
}
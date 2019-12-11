const StoreModel = require('shared').StoreModel;
const RuleModel = require('shared').RuleModel;
const UpdateModel = require('shared').UpdateModel;
const VariantModel = require('shared').VariantModel;
const ProductModel = require('shared').ProductModel;
const ProfileModel = require('shared').ProfileModel;
const CollectionModel = require('shared').CollectionModel;
const formattedRule = require('./functions').formattedRule
const fetch = require('node-fetch');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const moment = require('moment')
const formattedStore = require('../Store/functions').formattedStore
const {
  FACEBOOK_SERVICE, TWITTER_SERVICE, BUFFER_SERVICE,
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
  POST_AS_OPTION_TW_PHOTO,
  POST_AS_OPTION_NONE,
  POST_AS_OPTION_FB_PHOTO,
  POSTING_SORTORDER_RANDOM,
  POSTING_SORTORDER_NEWEST,
  COLLECTION_OPTION_ALL,
  COLLECTION_OPTION_SELECTED
} = require('shared/constants');

const { TEST, POSTED, FAILED, NOT_SCHEDULED, PENDING, APPROVED, SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT } = require('shared/constants');


module.exports = {
  manageRule: async (obj, args, context, info) => {
    let ruleParams = {};
    let ruleDetail;
    for (item in args.input) {
      if (item !== "id" || item !== "uniqKey") {
        ruleParams[item] = args.input[item];
      }
    }
    // create or update rule based on the param 'id'
    if (!_.has(args.input, 'id')) {
      ruleDetail = await RuleModel.create(ruleParams);
      const storeDetail = await StoreModel.findById(ruleDetail.store);
      storeDetail.rules.push(ruleDetail._id);
      await storeDetail.save();
    } else {
      ruleId = args.input.id
      ruleParams['active'] = true;
      await RuleModel.updateOne({ _id: args.input.id }, ruleParams, { upsert: true });
      ruleDetail = await RuleModel.findOne({ _id: args.input.id });
    }

    // if the rule is for edit, than delete all the pending and approved posts and reschedule posts with new settings. 
    if (_.has(args.input, 'id')) {
      const sampleUpdate = await UpdateModel.findOne({ rule: args.input.id, scheduleState: { $in: [PENDING, APPROVED] } });
      if (!_.isNull(sampleUpdate)) {
        let itemToSelect;
        let itemModel;
        if (!_.isUndefined(sampleUpdate.variant)) {
          itemToSelect = 'variant';
          itemModel = VariantModel;
        } else if (!_.isUndefined(sampleUpdate.product)) {
          itemToSelect = 'product';
          itemModel = ProductModel;
        }
        const ruleUpdates = await UpdateModel.find({
          rule: args.input.id,
          scheduleState: { $in: [PENDING, APPROVED] }
        }).select(itemToSelect)

        const items = await itemModel.find({ _id: { $in: ruleUpdates.map(update => update[itemToSelect]) } })
        let updateProducts = [];
        items.map(item => {
          const updateItemShareHistory = [];
          item.shareHistory.map(itemScheduleHistory => {
            if (ruleDetail.profile === itemScheduleHistory.profile) {
              if ((itemScheduleHistory.counter - 1) > 0) {
                updateItemShareHistory.push({
                  _id: itemScheduleHistory._id,
                  profile: itemScheduleHistory.profile,
                  counter: itemScheduleHistory.counter - 1
                })
              }

            } else {
              updateItemShareHistory.push(itemScheduleHistory);
            }
          });
          updateProducts.push(
            {
              updateOne: {
                filter: { uniqKey: item.uniqKey },
                update: {
                  shareHistory: updateItemShareHistory
                }
              }
            }
          );
        });
        if (!_.isEmpty(updateProducts)) {
          const products = await itemModel.bulkWrite(updateProducts);
        }
        const updatesDeleted = await UpdateModel.deleteMany(
          {
            rule: args.input.id,
            scheduleState: { $in: [NOT_SCHEDULED, PENDING, APPROVED] },
            scheduleTime: { $gte: moment().utc() },
            scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          })
      }
    }
    if (process.env.IS_OFFLINE === 'false') {
      await sqsHelper.addToQueue('CreateUpdates', { ruleId: ruleDetail._id, ruleIdForScheduler: ruleDetail._id });
    } else {
      // await createUpdates({ ruleId: ruleDetail._id });
      // await schedule({ ruleId: ruleDetail._id });
      // await addCaptions();
    }
    const ruleResult = formattedRule(ruleDetail);
    return ruleResult;
  },
  listRules: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    try {
      let searchQuery = RuleModel.find({ store: args.filter.storeId, type: args.filter.type });
      if (!_.isUndefined(args.filter.profile)) {
        searchQuery = searchQuery.find({ profile: args.filter.profile });
      }
      // console.log("TCL: searchQuery", searchQuery)

      const rules = await searchQuery;
      return rules.map(rule => {
        return formattedRule(rule);
      })
    } catch (error) {
      throw error;
    }
  },
  deleteRule: async (obj, args, context, info) => {
    try {
      const ruleDetail = await RuleModel.findById(args.ruleId);
      const ruleDeleted = await RuleModel.findByIdAndDelete(args.ruleId);
      const updatesDeleted = await UpdateModel.deleteMany({ rule: args.ruleId, scheduleState: { $nin: [POSTED, FAILED] } })
      const storeDetail = await StoreModel.findById(ruleDetail.store);
      storeDetail.rules.pop(ruleDetail._id);
      await storeDetail.save();
      return formattedRule(ruleDetail);
    } catch (error) {
      throw error;
    }
  },
  getRule: async (obj, args, context, info) => {
    try {
      const ruleDetail = await RuleModel.findOne({ _id: args.ruleId, store: args.storeId });
      return formattedRule(ruleDetail);
    } catch (error) {
      throw error;
    }
  },
  syncRules: async (obj, args, context, info) => {
    console.log("TCL: syncProfiles args", args)
    // try {
    let res;
    const storeDetail = await StoreModel.findById(args.storeId);
    const url = `https://posting.ly/cron/sync_rules/${storeDetail.partnerId}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      method: "GET",
    }).then(response => response.json());
    // console.log("TCL: response", response)
    const rules = [];
    Object.keys(response).map(userIds => {
      Object.keys(response[userIds]).map(responseRuleType => {
        parentObject = module.exports.getProfile(response[userIds][responseRuleType]['service']);
        let postAsOption = POST_AS_OPTION_NONE;
        if (parentObject.profileService === TWITTER_SERVICE) {
          postAsOption = POST_AS_OPTION_TW_PHOTO;
        } else if (parentObject.profileService === FACEBOOK_SERVICE) {
          postAsOption = POST_AS_OPTION_FB_PHOTO;
        }
        postTime = Object.keys(response[userIds][responseRuleType]['postTimings']).map(postTime => response[userIds][responseRuleType]['postTimings'][postTime]);
        if (responseRuleType === 'new') {
          console.log("TCL: response[userIds][responseRuleType]['postTimings']", response[userIds][responseRuleType]['postTimings'])
          console.log("TCL: postTime", postTime)
        }
        rules.push({
          store: args.storeId,
          service: parentObject.profileService,
          type: responseRuleType,
          profile: response[userIds][responseRuleType]['profile'],
          postAsOption: postAsOption,
          allowZeroQuantity: response[userIds][responseRuleType]['allowZeroQuantity'],
          postAsVariants: false,
          rotateImages: false,
          postingProductOrder: (response[userIds][responseRuleType]['postingProductOrder'] === 'random') ? POSTING_SORTORDER_RANDOM : POSTING_SORTORDER_NEWEST,
          captions: [
            {
              captionCollectionOption: COLLECTION_OPTION_ALL,
              collections: [],
              isDefault: true,
              captionTexts: response[userIds][responseRuleType]['caption']
            }
          ],
          disallowedCollections: response[userIds][responseRuleType]['disallowedCollections'],
          postTimings: postTime
        })
      })
    });
    const rulesInsert = [];
    // console.log("TCL: rules", rules)
    await Promise.all(rules.map(async (rule, ruleIndex) => {
      console.log("TCL: rule", rule)
      if (_.isUndefined(rule.profile)) {
        return;
      }
      const profile = await ProfileModel.findOne({ serviceUserId: rule.profile, service: rule.service })
      console.log("TCL: profile", profile)
      const disallowedCollections = await CollectionModel.find({ partnerId: { $in: rule.disallowedCollections } })
      let postTimings = await module.exports.getPostTimings(rule.postTimings);
      postTimings = _.sortBy(postTimings, 'postingMinute');
      postTimings = _.sortBy(postTimings, 'postingHour');
      rulesInsert.push({
        updateOne: {
          filter: { store: rule.store, profile: profile._id, type: rule.type },
          update: {
            store: rule.store,
            service: rule.service,
            type: rule.type,
            profile: profile._id,
            postAsOption: rule.postAsOption,
            allowZeroQuantity: (rule.allowZeroQuantity === '1' || rule.allowZeroQuantity === 1) ? true : false,
            postAsVariants: rule.postAsVariants,
            rotateImages: rule.rotateImages,
            postingProductOrder: rule.postingProductOrder,
            disallowedCollections: disallowedCollections,
            captions: rule.captions,
            postTimings: postTimings,
            active: false,
          },
          upsert: true
        }
      })
    }));
    console.log("TCL: rulesInsert", rulesInsert.length)
    const result = await RuleModel.bulkWrite(rulesInsert);
    // console.log("TCL: result", result)
    const storeResult = formattedStore(storeDetail);
    return storeResult;
  },
  getPostTimings: async function (postTimings) {
    // console.log("TCL: postTimings", postTimings)
    let timings = [];
    await Promise.all(postTimings.map(async (postTiming) => {
      const collections = await CollectionModel.find({ partnerId: { $in: postTiming.collections } });
      timings.push({
        postingHour: postTiming.postingHour,
        postingMinute: postTiming.postingMinute,
        postingDays: postTiming.postingDays,
        postingCollectionOption: (postTiming.postingCollectionOption === 'cats_selected') ? COLLECTION_OPTION_SELECTED : COLLECTION_OPTION_ALL,
        collections: collections.map(collection => collection._id)
      })
    }));
    // console.log("TCL: timings", timings)
    return timings;
  },
  getProfile: function (service) {
    // console.log("TCL: service", service)
    let profileService = '';
    let profileServiceProfile = '';

    if (service === 'fb') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PAGE;
    }
    if (service === 'fb_page') {
      profileService = FACEBOOK_SERVICE;
      profileServiceProfile = FACEBOOK_PAGE;
    }
    if (service === 'tw') {
      profileService = TWITTER_SERVICE;
      profileServiceProfile = TWITTER_PROFILE;
    }
    if (service === 'buffer') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_PROFILE;
    }
    if (service === 'twitter_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_TWITTER_PROFILE;
    }
    if (service === 'facebook_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PROFILE;
    }
    if (service === 'facebook_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_PAGE;
    }
    if (service === 'facebook_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_FACEBOOK_GROUP;
    }
    if (service === 'linkedin_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PROFILE;
    }
    if (service === 'linkedin_page') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_PAGE;
    }
    if (service === 'linkedin_group') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_LINKEDIN_GROUP;
    }
    if (service === 'instagram_profile') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_PROFILE;
    }
    if (service === 'instagram_business') {
      profileService = BUFFER_SERVICE;
      profileServiceProfile = BUFFER_INSTAGRAM_BUSINESS;
    }
    return { profileService, profileServiceProfile };
  }

}
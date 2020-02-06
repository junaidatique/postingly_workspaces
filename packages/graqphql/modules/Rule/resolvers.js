const StoreModel = require('shared').StoreModel;
const RuleModel = require('shared').RuleModel;
const UpdateModel = require('shared').UpdateModel;

const updateClass = require('shared').updateClass;
const formattedRule = require('./functions').formattedRule

const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
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
      await updateClass.deleteScheduledUpdates(args.input.id)
    }
    if (process.env.IS_OFFLINE === 'false') {
      await sqsHelper.addToQueue('CreateUpdates', { ruleId: ruleDetail._id, ruleIdForScheduler: ruleDetail._id });
    } else {
      await updateClass.createUpdates({ ruleId: ruleDetail._id })
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
      const rules = await searchQuery;
      return rules.map(rule => {
        return formattedRule(rule);
      })
    } catch (error) {
      throw error;
    }
  },
  changeRuleStatus: async (obj, args, context, info) => {
    try {
      const ruleDetail = await RuleModel.findOne({ _id: args.ruleId });
      await RuleModel.updateOne({ _id: args.ruleId }, { active: !ruleDetail.active });
      if (ruleDetail.active) {
        // const updatesDeleted = await UpdateModel.deleteMany({ rule: args.ruleId, scheduleState: { $nin: [POSTED, FAILED] } });
        await updateClass.deleteScheduledUpdates(args.ruleId)
      } else {
        if (process.env.IS_OFFLINE === 'false') {
          await sqsHelper.addToQueue('CreateUpdates', { ruleId: ruleDetail._id, ruleIdForScheduler: ruleDetail._id });
        } else {
          await updateClass.createUpdates({ ruleId: ruleDetail._id, ruleIdForScheduler: ruleDetail._id }, context.context)
        }
      }
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




}
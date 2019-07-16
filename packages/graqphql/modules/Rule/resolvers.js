const RuleModel = require('shared').RuleModel;
const UpdateModel = require('shared').UpdateModel;
const formattedRule = require('./functions').formattedRule
const _ = require('lodash');
const moment = require('moment')
const query = require('shared').query;
let createUpdates;
const { TEST, POSTED, FAILED, NOT_SCHEDULED, PENDING, APPROVED } = require('shared/constants');
if (process.env.IS_OFFLINE || process.env.STAGE == TEST) {
  createUpdates = require('functions').createUpdates.createUpdates;
  schedule = require('functions').scheduleProducts.schedule;
}

module.exports = {
  manageRule: async (obj, args, context, info) => {
    let ruleParams = {};
    let ruleDetail;
    for (item in args.input) {
      if (item !== "id" || item !== "uniqKey") {
        ruleParams[item] = args.input[item];
      }
    }
    if (!_.has(args.input, 'id')) {
      ruleDetail = await RuleModel.create(ruleParams);
    } else {
      ruleId = args.input.id
      await RuleModel.updateOne({ _id: args.input.id }, ruleParams, { upsert: true });
      ruleDetail = await RuleModel.findOne({ _id: args.input.id });
    }
    if (process.env.IS_OFFLINE || process.env.STAGE === TEST) {
      if (_.has(args.input, 'id')) {
        const updatesDeleted = await UpdateModel.deleteMany(
          {
            rule: args.input.id,
            scheduleState: { $in: [NOT_SCHEDULED, PENDING, APPROVED] },
            scheduleTime: { $gte: moment().utc() }
          })
      }
      await createUpdates({ ruleId: ruleDetail._id });
      await schedule({ ruleId: ruleDetail._id });
    }
    const ruleResult = formattedRule(ruleDetail);
    return ruleResult;
  },
  listRules: async (obj, args, context, info) => {
    try {
      const searchQuery = RuleModel.find({ store: args.filter.storeId, service: args.filter.service, type: args.filter.type });
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
  }
}
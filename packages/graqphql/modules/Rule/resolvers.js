const RuleModel = require('shared').RuleModel;
const formattedRule = require('./functions').formattedRule
const _ = require('lodash');
const query = require('shared').query;
let createUpdates;
const { TEST } = require('shared/constants');
if (process.env.IS_OFFLINE == true || process.env.STAGE == TEST) {
  createUpdates = require('functions').createUpdates.createUpdates;
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

    if (process.env.IS_OFFLINE == true || process.env.STAGE == TEST) {
      createUpdates({ id: ruleDetail._id });
    }
    const ruleResult = formattedRule(ruleDetail);
    return ruleResult;
  },
  listRules: async (obj, args, context, info) => {
    try {
      const searchQuery = query.createSearchQuery(RuleModel, args);
      const rules = await searchQuery;
      return rules.map(rule => {
        return formattedRule(rule);
      })
    } catch (error) {
      throw error;
    }
  }
}
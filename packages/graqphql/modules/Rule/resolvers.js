const RuleModel = require('shared').RuleModel;
const UpdateModel = require('shared').UpdateModel;
const VariantModel = require('shared').VariantModel;
const ProductModel = require('shared').ProductModel;
const formattedRule = require('./functions').formattedRule
const _ = require('lodash');
const moment = require('moment')
const query = require('shared').query;
let createUpdates;
let schedule;
let addCaptions;
const { TEST, POSTED, FAILED, NOT_SCHEDULED, PENDING, APPROVED, SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT } = require('shared/constants');
if (process.env.IS_OFFLINE || process.env.STAGE == TEST) {
  createUpdates = require('functions').createUpdates.createUpdates;
  schedule = require('functions').scheduleProducts.schedule;
  addCaptions = require('functions').cronAddCaptions.execute;
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
            if (ruleDetail.profiles.includes(itemScheduleHistory.profile)) {
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
    if (process.env.IS_OFFLINE || process.env.STAGE === TEST) {
      await createUpdates({ ruleId: ruleDetail._id });
      await schedule({ ruleId: ruleDetail._id });
      await addCaptions();
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
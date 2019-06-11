const StoreModel = require('shared').StoreModel;
const RuleModel = require('shared').RuleModel;
const createUpdates = require('functions').createUpdates.createUpdates;


const createRuleStub = async (ruleParams) => {
  const storeDetail = await StoreModel.findById(ruleParams.store);
  ruleDetail = await RuleModel.create(ruleParams);
  await storeDetail.rules.push(ruleDetail);
  await storeDetail.save();
  await createUpdates({ id: ruleDetail._id });
  return ruleDetail;
}

exports.createRuleStub = createRuleStub;
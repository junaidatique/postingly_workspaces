const storeFunctions = require('../Store/functions');
const formattedRule = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store)
  }
}
const getRuleById = async ruleId => {
  const ruleDetail = await RuleModel.findOne(ruleId);
  if (storeDetail === null) {
    throw new UserInputError('Rule not found.');
  }
  return formattedRule(ruleDetail)
}
exports.formattedRule = formattedRule
exports.getRuleById = getRuleById
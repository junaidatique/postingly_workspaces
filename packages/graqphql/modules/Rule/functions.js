const RuleModel = require('shared').RuleModel;
const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const collectionFunctions = require('../Collection/functions');
const formattedRule = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store),
    profiles: profileFunctions.getProfiles.bind(this, rule._doc.profiles),
    collections: collectionFunctions.getCollections.bind(this, rule._doc.collections),
    captions: formatCaptions.bind(this, rule._doc.captions),
    createdAt: (rule.createdAt !== undefined) ? rule.createdAt.toISOString() : null,
  }
}
const getRuleById = async ruleId => {
  const ruleDetail = await RuleModel.findOne(ruleId);
  if (ruleDetail === null) {
    throw new UserInputError('Rule not found.');
  }
  return formattedRule(ruleDetail)
}
const formatCaptions = captions => {
  return captions.map(caption => {
    return {
      captionCollectionOption: caption.captionCollectionOption,
      isDefault: caption.isDefault,
      captionTexts: caption.captionTexts,
      collections: collectionFunctions.getCollections.bind(this, caption.collections),
    }
  })
}
exports.formattedRule = formattedRule
exports.getRuleById = getRuleById
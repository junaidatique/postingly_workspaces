const RuleModel = require('shared').RuleModel;
const storeFunctions = require('../Store/functions');
const profileFunctions = require('../Profile/functions');
const collectionFunctions = require('../Collection/functions');
const productFunctions = require('../Product/functions');
const _ = require('lodash');
const moment = require('moment');
const formattedRule = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store),
    profile: profileFunctions.getProfileById.bind(this, rule._doc.profile),
    selectedProducts: productFunctions.getProducts.bind(this, rule._doc.selectedProducts),
    disallowedCollections: collectionFunctions.getCollections.bind(this, rule._doc.disallowedCollections),
    captions: formatCaptions.bind(this, rule._doc.captions),
    postTimings: formatPostTimings.bind(this, rule._doc.postTimings),
    createdAt: (rule.createdAt !== undefined) ? rule.createdAt.toISOString() : null,
    productRepeatFinalDate: (rule.productRepeatFinalDate) ? moment(rule.productRepeatFinalDate).toISOString() : null,

  }
}

const getRuleById = async ruleId => {
  const ruleDetail = await RuleModel.findOne(ruleId);
  if (ruleDetail === null) {
    // throw new UserInputError('Rule not found.');
  }
  return formattedRule(ruleDetail)
}
const getRules = async ruleIds => {
  rules = await RuleModel.find({ _id: { $in: ruleIds } });
  return rules.map(rule => {
    return formattedRule(rule)
  }).filter(function (item) {
    return !_.isUndefined(item);
  });
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
const formatPostTimings = postTimes => {
  return postTimes.map(postTime => {
    return {
      postingCollectionOption: postTime.postingCollectionOption,
      postingHour: postTime.postingHour,
      postingMinute: postTime.postingMinute,
      collections: collectionFunctions.getCollections.bind(this, postTime.collections),
      postingDays: postTime.postingDays
    }
  })
}
exports.formattedRule = formattedRule
exports.getRuleById = getRuleById
exports.getRules = getRules
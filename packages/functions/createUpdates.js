const RuleModel = require('shared').RuleModel;
module.exports = {
  createUpdates: async function (event, context) {
    try {
      const ruleDetail = RuleModel.findById(event.id);
      if (ruleDetail === null) {
        console.log('ruleDetail', ruleDetail);
      }
    } catch (error) {
      console.error(error.message);
    }

  }
}
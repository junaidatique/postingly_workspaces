const shared = require('shared');


const createUpdates = require('functions').createUpdates.createUpdates;
const createUpdatesforNextWeek = require('functions').createUpdates.createUpdatesforNextWeek;
const schedule = require('functions').scheduleProducts.schedule;
const cronThisWeekRulesForUpdates = require('functions').cronThisWeekRulesForUpdates.excute;
const cronAddCaptions = require('functions').cronAddCaptions.execute;
const changeCaption = require('functions').changeCaption.update;
const shareUpdates = require('functions').shareUpdates.share;

const { PARTNERS_SHOPIFY, FACEBOOK_SERVICE, TWITTER_SERVICE, BUFFER_SERVICE, APPROVED } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findOne()
    const UpdateModel = shared.UpdateModel;
    const storeId = storeDetail._id;
    const RuleModel = shared.RuleModel;

    // await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
    const ruleDetail = await RuleModel.findOne({ store: storeId }).populate('profiles');
    console.log("TCL: ruleDetail", ruleDetail)
    // await createUpdates({ ruleId: ruleDetail._id });
    // await createUpdatesforNextWeek();
    // await cronThisWeekRulesForUpdates();

    // await schedule({ ruleId: ruleDetail._id });
    // await cronAddCaptions();
    // await changeCaption({ service: BUFFER_SERVICE, storeId: null });
    // await cronPostUpdates();
    // updates = await UpdateModel.findOne({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
    // console.log("TCL: updates", updates)
    // await shareUpdates({ updateId: updates._id });


  }
}
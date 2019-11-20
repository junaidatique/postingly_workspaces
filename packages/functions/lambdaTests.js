const shared = require('shared');
const moment = require('moment')

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
    console.log("TCL: StoreModel", StoreModel)
    const ProductModel = shared.ProductModel;
    const storeDetail = await StoreModel.findOne()
    console.log("TCL: storeDetail", storeDetail)

    const UpdateModel = shared.UpdateModel;
    const storeId = storeDetail._id;
    const PartnerShopify = shared.PartnerShopify;
    const response = await UpdateModel.aggregate.match({ "scheduleDayOfYear": moment().dayOfYear() })
    console.log("TCL: response", response)
    // await PartnerShopify.confirmUninstalled(storeId);
    // const RuleModel = shared.RuleModel;

    // await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
    // const ruleDetail = await RuleModel.findOne({ store: storeId }).populate('profiles');
    // await createUpdates({ ruleId: ruleDetail._id });
    // // await createUpdatesforNextWeek();
    // // await cronThisWeekRulesForUpdates();

    // await schedule({ ruleId: ruleDetail._id });
    // // await cronAddCaptions();
    // await changeCaption({ service: FACEBOOK_SERVICE, storeId: null });
    // // await cronPostUpdates();
    // updates = await UpdateModel.findOne({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
    // // console.log("TCL: updates", updates)
    // await shareUpdates({ updateId: updates._id });


  }
}
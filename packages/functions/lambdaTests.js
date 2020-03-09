const shared = require('shared');
const moment = require('moment')
const _ = require('lodash')

const createUpdates = require('functions').createUpdates.createUpdates;
const createUpdatesforThisWeek = require('functions').createUpdates.createUpdatesforThisWeek;
const createUpdatesforNextWeek = require('functions').createUpdates.createUpdatesforNextWeek;
const schedule = require('functions').scheduleProducts.schedule;
const cronThisWeekRulesForUpdates = require('functions').cronThisWeekRulesForUpdates.excute;
const cronAddCaptions = require('functions').cronAddCaptions.execute;
const changeCaption = require('functions').changeCaption.update;
const updateProductUrls = require('functions').updateProductUrls.execute;
const shareUpdates = require('functions').shareUpdates.share;

const {
  PARTNERS_SHOPIFY,
  FACEBOOK_SERVICE,
  TWITTER_SERVICE,
  BUFFER_SERVICE,
  APPROVED,
  POSTED,
  FAILED,
  COLLECTION_OPTION_SELECTED,
  RULE_TYPE_MANUAL,
  RULE_TYPE_NEW,
  RULE_TYPE_OLD } = require('shared/constants')
module.exports = {
  execute: async function (event, context) {
    const StoreModel = shared.StoreModel;
    // console.log("TCL: StoreModel", StoreModel)
    const ProductModel = shared.ProductModel;
    // const storeDetail = await StoreModel.findOne()
    const storeDetail = await StoreModel.findOne({ _id: '5dc439c89a44ab02a5ace9bf' })
    // console.log("TCL: storeDetail", storeDetail)

    const UpdateModel = shared.UpdateModel;
    const storeId = storeDetail._id;
    const PartnerShopify = shared.PartnerShopify;

    await UpdateModel.collection.deleteMany({ _id: { $exists: true } });

    const RuleModel = shared.RuleModel;
    const ruleDetail = await RuleModel.findOne({ store: storeId, type: RULE_TYPE_OLD }).populate('profiles');

    // first iteration.
    console.log("TCL: createUpdates ---------------------------------------------------------")
    await createUpdates({ ruleId: ruleDetail._id }, context);
    // await createUpdates({ ruleId: ruleDetail._id });
    // console.log("TCL: schedule ---------------------------------------------------------")
    await schedule({ ruleId: ruleDetail._id }, context);
    // await schedule({ ruleId: ruleDetail._id, "postingCollectionOption": COLLECTION_OPTION_SELECTED }, context);
    console.log("TCL: updateProductUrls ---------------------------------------------------------")
    await updateProductUrls();
    console.log("TCL: changeCaption ---------------------------------------------------------")
    await changeCaption({ rule: ruleDetail._id, storeId: null });
    console.log("TCL: Postupdates ---------------------------------------------------------")
    // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: FAILED, postingTime: moment().toISOString(), failedMessage: `You've filled the queue for your <b>Zxeus Showcase</b> LinkedIn Page account, nice work! Upgrading to any paid plan will unlock more space. <a class="embedded-cta-link" href="https://buffer.com/pro" target="_blank">See Paid Plans</a>` })
    await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: POSTED, postingTime: moment().toISOString() })

    // // second iteration.
    // const lastUpdate = await UpdateModel.findOne({ store: storeId }).sort({ scheduleTime: -1 });
    // await createUpdates({ ruleId: ruleDetail._id, scheduleWeek: lastUpdate.scheduleTime });
    // await schedule({ ruleId: ruleDetail._id });
    // await changeCaption({ rule: ruleDetail._id, storeId: null });


    // // third iteration
    // await schedule({ ruleId: ruleDetail._id });
    // await changeCaption({ rule: ruleDetail._id, storeId: null });
    // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: POSTED, postingTime: moment().toISOString() })

    // if (_.isNull(lastUpdate)) {
    //   await createUpdates({ ruleId: ruleDetail._id });
    // } else {
    //   await createUpdates({ ruleId: ruleDetail._id, scheduleWeek: lastUpdate.scheduleTime });
    // }
    // // await createUpdates({ ruleId: ruleDetail._id });
    // // // await createUpdatesforNextWeek();
    // // // await cronThisWeekRulesForUpdates();

    // await schedule({ ruleId: ruleDetail._id });
    // // await cronAddCaptions();
    // await changeCaption({ rule: ruleDetail._id, storeId: null });
    // // // await cronPostUpdates();
    // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: POSTED, postingTime: moment().toISOString() })
    // // updates = await UpdateModel.findOne({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
    // // console.log("TCL: updates", updates)
    // // await shareUpdates({ updateId: updates._id });


  }
}
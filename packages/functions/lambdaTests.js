const shared = require('shared');
const moment = require('moment')
const _ = require('lodash')

const createUpdates = require('functions').createUpdates.createUpdates;
const createUpdatesforThisWeek = require('functions').createUpdates.createUpdatesforThisWeek;
const createUpdatesforNextWeek = require('functions').createUpdates.createUpdatesforNextWeek;
const schedule = require('functions').scheduleProducts.schedule;
const cronThisWeekRulesForUpdates = require('functions').cronThisWeekRulesForUpdates.execute;
const cronAddCaptions = require('functions').cronAddCaptions.execute;
const changeCaption = require('functions').changeCaption.update;
const updateProductUrls = require('functions').updateProductUrls.execute;
const shareUpdates = require('functions').shareUpdates.share;
const bufferShareUpdates = require('functions').shareUpdates.bufferShare;
const facebookService = require('shared').FacebookService
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
        const UpdateModel = shared.UpdateModel;
        const ProductModel = shared.ProductModel;
        const StoreModel = shared.StoreModel;
        const RuleModel = shared.RuleModel;
        const PartnerShopify = shared.PartnerShopify;

        // // console.log("TCL: storeDetail ---------------------------------------------------------")
        // const storeDetail = await StoreModel.findOne()
        const storeDetail = await StoreModel.findOne({ _id: '5e37d833ada1d5000834b422' })
        const storeId = storeDetail._id;
        // // console.log("TCL: storeDetail ---------------------------------------------------------")



        // // console.log("TCL: deleteMany & ruleDetail ---------------------------------------------------------")
        await UpdateModel.collection.deleteMany({ _id: { $exists: true } });
        const ruleDetail = await RuleModel.findOne({ store: storeId, type: RULE_TYPE_OLD }).populate('profiles');
        // // console.log("TCL: deleteMany & ruleDetail ---------------------------------------------------------")

        // // first iteration.
        // // console.log("TCL: createUpdates ---------------------------------------------------------")
        await createUpdates({ ruleId: ruleDetail._id }, context);
        // // console.log("TCL: schedule ---------------------------------------------------------")
        await schedule({ ruleId: ruleDetail._id }, context);
        // // await schedule({ ruleId: ruleDetail._id, "postingCollectionOption": COLLECTION_OPTION_SELECTED }, context);
        // // console.log("TCL: updateProductUrls ---------------------------------------------------------")
        await updateProductUrls({});
        // // console.log("TCL: changeCaption ---------------------------------------------------------")
        await changeCaption({ rule: ruleDetail._id, storeId: null });
        // // console.log("TCL: Postupdates ---------------------------------------------------------")
        // // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: FAILED, postingTime: moment().toISOString(), failedMessage: `` })
        // // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: POSTED, postingTime: moment().toISOString() })

        // // updates = await UpdateModel.findOne({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
        // // updates = await UpdateModel.findOne({sch}).sort({ createdAt: 1 });
        updates = await UpdateModel.find({ scheduleState: APPROVED }).limit(1);
        console.log("TCL: updates", updates.length)
        await Promise.all(updates.map(async update => {
            await shareUpdates({ updateId: update._id });
        }));


    }
}
const shared = require('shared');
const moment = require('moment')
const _ = require('lodash')

// const createUpdates = require('functions').createUpdates.createUpdates;
// const createUpdatesforThisWeek = require('functions').createUpdates.createUpdatesforThisWeek;
// const createUpdatesforNextWeek = require('functions').createUpdates.createUpdatesforNextWeek;
// const schedule = require('functions').scheduleProducts.schedule;
// const cronThisWeekRulesForUpdates = require('functions').cronThisWeekRulesForUpdates.excute;
// const cronAddCaptions = require('functions').cronAddCaptions.execute;
// const changeCaption = require('functions').changeCaption.update;
// const updateProductUrls = require('functions').updateProductUrls.execute;
// const shareUpdates = require('functions').shareUpdates.share;
// const facebookService = require('shared').FacebookService
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
const dbConnection = require('./db');
module.exports = {
  execute: async function (event, context) {
    await dbConnection.createConnection(context);
    const StoreModel = shared.StoreModel;
    const RuleModel = shared.RuleModel;
    const stores = await StoreModel.find({ isUninstalled: false });
    console.log("stores.length", stores.length);
    await Promise.all(stores.map(async store => {
      let updatedRules = store.rules;
      const rules = await RuleModel.find({ store: store._id });
      updatedRules = [...updatedRules, ...rules.map(rule => rule._id)];
      updatedRules = module.exports.uniqueArray1(updatedRules);
      console.log("updatedRules", updatedRules)
      store.rules = updatedRules;
      await store.save();
    }));
    // const token = "EAACwJczql2ABAMYRKLOXHYoOLD3Q5XaWkulc0WdzAkxRejGEHA1GDHFgIoxnLVspydjFzP8J9PrmcwhTZBcwnXmG9QPZC2NMBKcDtqBH1Pb4j7XMAR9eSANPTdeSndprFpYArJHMKMsmejLKrPebgjRMIWxQRYtZAyIxs7flsS3upTirGIO";
    // const serviceUserId = 549867861701636;
    // const albums = await facebookService.getDefaultAlbum(serviceUserId, token);
    // console.log("albums", albums)
    // // console.log("TCL: StoreModel", StoreModel)
    // const ProductModel = shared.ProductModel;
    // // const storeDetail = await StoreModel.findOne()
    // const storeDetail = await StoreModel.findOne({ _id: '5e9721e2d317bb22f149abef' })
    // // console.log("TCL: storeDetail", storeDetail)

    // const UpdateModel = shared.UpdateModel;
    // // const storeId = storeDetail._id;
    // // const PartnerShopify = shared.PartnerShopify;

    // // await UpdateModel.collection.deleteMany({ _id: { $exists: true } });

    // // const RuleModel = shared.RuleModel;
    // // const ruleDetail = await RuleModel.findOne({ store: storeId, type: RULE_TYPE_OLD }).populate('profiles');

    // // first iteration.
    // // console.log("TCL: createUpdates ---------------------------------------------------------")
    // // await createUpdates({ ruleId: ruleDetail._id }, context);    
    // // console.log("TCL: schedule ---------------------------------------------------------")
    // // await schedule({ ruleId: ruleDetail._id }, context);
    // // await schedule({ ruleId: ruleDetail._id, "postingCollectionOption": COLLECTION_OPTION_SELECTED }, context);
    // // console.log("TCL: updateProductUrls ---------------------------------------------------------")
    // // await updateProductUrls();
    // // console.log("TCL: changeCaption ---------------------------------------------------------")
    // // await changeCaption({ rule: "5ea9bfe30e46d97b2a4300b1", storeId: null });
    // // console.log("TCL: Postupdates ---------------------------------------------------------")
    // // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: FAILED, postingTime: moment().toISOString(), failedMessage: `` })
    // // await UpdateModel.updateMany({ scheduleState: APPROVED }, { scheduleState: POSTED, postingTime: moment().toISOString() })

    // // updates = await UpdateModel.findOne({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } });
    // // updates = await UpdateModel.findOne({sch}).sort({ createdAt: 1 });
    // // console.log("TCL: updates", updates)
    // updates = await UpdateModel.find({ scheduleState: APPROVED, scheduleTime: { $gt: new Date() } }).limit(25);
    // await Promise.all(updates.map(async update => {
    //   await shareUpdates({ updateId: update._id });
    // }));


  },
  uniqueArray1: function (ar) {
    var j = {};

    ar.forEach(function (v) {
      j[v + '::' + typeof v] = v;
    });

    return Object.keys(j).map(function (v) {
      return j[v];
    });
  },
}
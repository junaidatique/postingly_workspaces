const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { FREE_PLAN, BUFFER_SERVICE, RULE_TYPE_MANUAL, RULE_TYPE_NEW } = require('shared/constants');
// const scheduleProducts = require('functions').scheduleProducts.schedule;
const dbConnection = require('./db');

module.exports = {
  execute: async function (event, context) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    await dbConnection.createConnection(context);
    const StoreModel = shared.StoreModel;
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const stores = await StoreModel.find(
      {
        freeProActivated: true,
        createdAt: {
          $lt: moment().subtract(7, 'days')
        }
      }
    )
    console.log("stores", stores)
    await Promise.all(stores.map(async store => {

      await RuleModel.updateMany({ store: store._id, type: RULE_TYPE_MANUAL }, { active: false })
      await RuleModel.updateMany({ store: store._id, type: RULE_TYPE_NEW }, { active: false })
      await RuleModel.updateMany({ store: store._id, service: BUFFER_SERVICE }, { active: false })
      await UpdateModel.updateMany({ store: store._id, service: BUFFER_SERVICE }, { freeProExpired: true })

      store.freeProActivated = false;
      store.paymentPlan = FREE_PLAN;
      await store.save();
    }));


  },
}
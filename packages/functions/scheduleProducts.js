const shared = require('shared');
const moment = require('moment')
const { NOT_SCHEDULED, SCHEDULED, SCHEDULE_TYPE_PRODUCT } = require('shared/constants');


module.exports = {
  schedule: async function (event, context) {
    try {
      const RuleModel = shared.RuleModel;
      const StoreModel = shared.StoreModel;
      const ProfileModel = shared.ProfileModel;
      const UpdateModel = shared.UpdateModel;
      const ProductModel = shared.ProductModel;

      let query, products, counter = 0, updates, update, existingUpdates, existingUpdateProducts;
      const ruleDetail = await RuleModel.findById(event.ruleId);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }
      const storeDetail = await StoreModel.findById(ruleDetail.store);


      query = ProductModel.where({ store: storeDetail._id, active: true, postableByPrice: true });
      if (ruleDetail.type == 'old') {
        query = query.where({ postableIsNew: false })
      }
      if (!ruleDetail.allowZeroQuantity) {
        query = query.where({ postableByQuantity: true })
      }
      if (ruleDetail.postingProductOrder == 'newest') {
        query = query.sort({ partnerCreatedAt: desc })
      } else {
        query = query.limit(-1).skip(Math.random() * ProductModel.count())
      }

      // query = query.where('_id').nin()
      query = query.limit(100);
      products = await query;

      await Promise.all(ruleDetail.profiles.map(async profile => {
        0
        existingUpdates = await UpdateModel.find(
          {
            profile: profile,
            scheduleState: SCHEDULED,
            scheduleType: SCHEDULE_TYPE_PRODUCT,
          }
        ).where('product').exists();
        existingUpdateProducts = existingUpdates.map(product => product);
        updates = await UpdateModel.find({ rule: ruleDetail._id, profile: profile, scheduleState: NOT_SCHEDULED, scheduleTime: { $gt: moment.utc() }, scheduleType: SCHEDULE_TYPE_PRODUCT }).sort({ scheduleTime: 1 });
        // console.log('updates', updates);
        if (updates.length > 0) {
          counter = 0;
          await Promise.all(products.map(async product => {
            update = updates[counter];
            update.product = product._id;
            update.scheduleState = SCHEDULED;
            counter++;
            // console.log('--------------', update);
            await update.save();

          }));
        }
        //   // await Promise.all(updates.map(async update => {
        //   //   update.product = product;
        //   //   update.scheduleState = SCHEDULED;
        //   //   await update.save();
        //   // }));
        // }
        // updates.forEach(update => {

        // })
      }))



    } catch (error) {
      console.error(error.message);
    }

  }
}
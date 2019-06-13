const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { NOT_SCHEDULED, SCHEDULED, SCHEDULE_TYPE_PRODUCT, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED, RULE_TYPE_OLD, RULE_TYPE_NEW, POSTING_SORTORDER_NEWEST, POSTING_SORTORDER_RANDOM } = require('shared/constants');


const ScheduleProductUpdates = {
  schedule: async function (event, context) {
    try {
      const RuleModel = shared.RuleModel;
      const UpdateModel = shared.UpdateModel;
      const ProductModel = shared.ProductModel;
      const VariantModel = shared.VariantModel;

      // define vars
      let products, counter = 0, updates, update;
      // get rule and store
      const ruleDetail = await RuleModel.findById(event.ruleId);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }

      await Promise.all(ruleDetail.profiles.map(async profile => {
        updates = await UpdateModel.find({ rule: ruleDetail._id, profile: profile, scheduleState: NOT_SCHEDULED, scheduleTime: { $gt: moment.utc() }, scheduleType: SCHEDULE_TYPE_PRODUCT }).sort({ scheduleTime: 1 });
        if (updates.length > 0) {
          if (ruleDetail.postAsVariants) {
            postItems = await ScheduleProductUpdates.getVariantsForSchedule(ruleDetail._id, profile, updates.length);
          } else {
            postItems = await ScheduleProductUpdates.getProductsForSchedule(ruleDetail._id, profile, updates.length);
          }


          counter = 0;
          await Promise.all(postItems.map(async item => {
            update = updates[counter];
            update.item = item._id;
            update.scheduleState = SCHEDULED;
            counter++;
            await update.save();

            profileHistory = await item.shareHistory.map(history => {
              if (history.profile.toString() == profile.toString()) {
                return history
              }
            });

            if (_.isEmpty(profileHistory)) {
              item.shareHistory = { profile: update.profile, counter: 1 };
              await item.save();
            } else {
              if (!ruleDetail.postAsVariants) {
                r = await ProductModel.updateOne({ _id: item._id, 'shareHistory.profile': profile },
                  {
                    '$set': {
                      'shareHistory.$.counter': profileHistory[0].counter + 1
                    }
                  });
              } else {
                r = await VariantModel.updateOne({ _id: item._id, 'shareHistory.profile': profile },
                  {
                    '$set': {
                      'shareHistory.$.counter': profileHistory[0].counter + 1
                    }
                  });
              }

            }

          }));
        }
      }))



    } catch (error) {
      console.error(error.message);
    }
  },
  getProductsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const ProductModel = shared.ProductModel;

    let query;
    const ruleDetail = await RuleModel.findById(ruleId);
    query = ProductModel.find({ store: ruleDetail.store, active: true, postableByPrice: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      query = query.sort({ partnerCreatedAt: desc })
    } else {
      query = query.limit(-1).skip(Math.random() * ProductModel.count())
    }
    query = query.limit(limit);
    const notSharedOnThisProfile = query.find({ "shareHistory.profile": { $ne: profileId } });

    let products = await notSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    lessSharedOnThisProfile = query.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 });
    products = await lessSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    return [];
  },
  getVariantsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const VariantModel = shared.VariantModel;

    let query;
    const ruleDetail = await RuleModel.findById(ruleId);
    query = VariantModel.find({ store: ruleDetail.store, active: true, postableByPrice: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      query = query.sort({ partnerCreatedAt: desc })
    } else {
      query = query.limit(-1).skip(Math.random() * VariantModel.count())
    }
    query = query.limit(limit);
    const notSharedOnThisProfile = query.find({ "shareHistory.profile": { $ne: profileId } });

    let products = await notSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    lessSharedOnThisProfile = query.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 });
    products = await lessSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    return [];
  }

}

module.exports = ScheduleProductUpdates;

const shared = require('shared');
const _ = require('lodash');
const moment = require('moment-timezone');
const sqsHelper = require('shared').sqsHelper;
const ProductModel = shared.ProductModel;
const {
  NOT_SCHEDULED,
  SCHEDULE_TYPE_PRODUCT,
  SCHEDULE_TYPE_VARIANT,
  PENDING,
  APPROVED,
  RULE_TYPE_MANUAL
} = require('shared/constants');
module.exports = {
  createUpdatesForThisWeek: async function (event) {
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const activeRules = await RuleModel.find({ active: true });
    const scheduleWeekRules = await UpdateModel.distinct('rule',
      {
        scheduleTime: { $gt: moment.utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
      }
    );
    const scheduleWeekRuleId = scheduleWeekRules.map(ruleId => ruleId.toString());
    const rules = activeRules.filter(x => !scheduleWeekRuleId.includes(x._id.toString()));
    if (process.env.IS_OFFLINE === 'false') {
      await Promise.all(rules.map(async ruleDetail => {
        await sqsHelper.addToQueue('CreateUpdates', { ruleId: ruleDetail._id });
      }));
    } else {
      await Promise.all(rules.map(async ruleDetail => {
        await this.createUpdates({ ruleId: ruleDetail._id })
      }));
    }
    const dbCollectionsUpdate = await ProductModel.updateMany(
      { postableIsNew: true, partnerCreatedAt: { $lt: moment().subtract(14, 'day') } },
      { postableIsNew: false }
    );
  },
  createUpdatesforNextWeek: async function (event, context) {
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const activeRules = await RuleModel.find({ active: true }).select('_id');
    const scheduleWeekRules = await UpdateModel.distinct('rule',
      {
        scheduleTime: { $gt: moment().add(1, 'weeks').startOf('isoWeek') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
      }
    );
    const scheduleWeekRuleId = scheduleWeekRules.map(ruleId => ruleId.toString());
    const rules = activeRules.filter(x => !scheduleWeekRuleId.includes(x._id.toString()));
    if (process.env.IS_OFFLINE === 'false') {
      await Promise.all(rules.map(async ruleDetail => {
        await sqsHelper.addToQueue('CreateUpdates', { ruleId: ruleDetail._id, scheduleWeek: 'next' });
      }));
    } else {
      await Promise.all(rules.map(async ruleDetail => {
        await this.createUpdates({ ruleId: ruleDetail._id, scheduleWeek: 'next' })
      }));
    }
  },
  createUpdatesForRule: function (ruleDetail, scheduleWeek, storeTimezone) {
    let updateTimes = [];
    let startOfWeek, endOfWeek;
    if (scheduleWeek === 'next') {
      startOfWeek = moment().add(1, 'weeks').tz(storeTimezone).startOf('isoWeek');
      endOfWeek = moment().add(1, 'weeks').tz(storeTimezone).endOf('isoWeek');
    } else if (!_.isUndefined(scheduleWeek)) { // this is used for testing purposes. 
      startOfWeek = moment(scheduleWeek);
      endOfWeek = moment(scheduleWeek).add(14, 'days');
    } else {
      startOfWeek = moment().tz(storeTimezone).startOf('isoWeek')
      endOfWeek = moment().add(1, 'weeks').tz(storeTimezone).endOf('isoWeek');
    }

    ruleDetail.postTimings.forEach((postTime) => {
      for (let loopTime = startOfWeek.clone(); loopTime.isBefore(endOfWeek); loopTime = loopTime.add(1, 'day')) {
        hour = loopTime.set({ 'hour': postTime.postingHour, 'minute': postTime.postingMinute });
        if (hour.isAfter(moment.utc()) && postTime.postingDays.includes(moment.weekdays(loopTime.weekday()))) {
          updateTimes.push(
            {
              time: hour.toISOString(),
              postingCollectionOption: postTime.postingCollectionOption,
              allowedCollections: postTime.collections,
              postTimingId: postTime._id,
            }
          );
        }
      }
    });
    return updateTimes;
  },
  createUpdatesForManualRule: function (ruleDetail, storeTimezone) {
    let updateTimes = [];
    const numberOfProducts = ruleDetail.selectedProducts.length;
    let startOfDay = moment.tz(storeTimezone).startOf('day');
    let updateTime = startOfDay.clone();
    if (ruleDetail.allowProductRepetition) {
      while (updateTime.isSameOrBefore(moment(ruleDetail.productRepeatFinalDate))) {
        updateTime = startOfDay.clone();
        ruleDetail.postTimings.forEach((postTime) => {
          hour = updateTime.set({ 'hour': postTime.postingHour, 'minute': postTime.postingMinute });
          if (hour.isAfter(moment.utc()) && postTime.postingDays.includes(moment.weekdays(updateTime.weekday()))) {
            updateTimes.push(
              {
                time: hour.toISOString(),
                postingCollectionOption: postTime.postingCollectionOption,
                allowedCollections: postTime.collections,
                postTimingId: postTime._id,
              }
            );
          }
        });
        startOfDay = startOfDay.add(1, 'day');
      }
    } else {
      while (numberOfProducts > updateTimes.length) {
        updateTime = startOfDay.clone();
        ruleDetail.postTimings.forEach((postTime) => {
          hour = updateTime.set({ 'hour': postTime.postingHour, 'minute': postTime.postingMinute });
          if (hour.isAfter(moment.utc()) && postTime.postingDays.includes(moment.weekdays(updateTime.weekday()))) {
            updateTimes.push(
              {
                time: hour.toISOString(),
                postingCollectionOption: postTime.postingCollectionOption,
                allowedCollections: postTime.collections,
                postTimingId: postTime._id,
              }
            );
          }
        });
        startOfDay = startOfDay.add(1, 'day');
      }
    }
    return updateTimes;
  },
  createUpdates: async function (event, context) {
    console.log("TCL: createUpdates event", event)
    let updateTimes = [];
    const RuleModel = shared.RuleModel;
    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;
    const scheduleClass = shared.scheduleClass;
    const ruleDetail = await RuleModel.findById(event.ruleId).populate('profile');
    if (!ruleDetail || !ruleDetail.profile) {
      console.error("TCL: rule or profile not found for ${event.ruleId}");
      return;
    }

    const storeDetail = await StoreModel.findById(ruleDetail.store);
    console.log("TCL: ruleDetail.store", storeDetail._id)
    if (ruleDetail.type === RULE_TYPE_MANUAL) {
      updateTimes = this.createUpdatesForManualRule(ruleDetail, storeDetail.timezone);
    } else {
      updateTimes = this.createUpdatesForRule(ruleDetail, event.scheduleWeek, storeDetail.timezone)
    }

    console.log("TCL: updateTimes.length", updateTimes.length)
    if (updateTimes.length > 0) {
      const profile = ruleDetail.profile;
      const bulkUpdatesWrite = updateTimes.map(updateTime => {
        return {
          updateOne: {
            filter: { uniqKey: `${ruleDetail.id}-${profile._id}-${updateTime.time}` },
            update: {
              store: storeDetail._id,
              rule: ruleDetail._id,
              profile: profile._id,
              service: ruleDetail.service,
              serviceProfile: profile.serviceProfile,
              postAsOption: ruleDetail.postAsOption,
              scheduleTime: updateTime.time,
              scheduleWeek: moment(updateTime.time).week(),
              scheduleDayOfYear: moment(updateTime.time).dayOfYear(),
              postType: ruleDetail.type,
              scheduleType: (ruleDetail.postAsVariants) ? SCHEDULE_TYPE_VARIANT : SCHEDULE_TYPE_PRODUCT,
              autoApproveUpdates: storeDetail.autoApproveUpdates,
              autoAddCaptionOfUpdates: storeDetail.autoAddCaptionOfUpdates,
              captionsUpdated: false,
              userEdited: false,
              postingCollectionOption: updateTime.postingCollectionOption,
              allowedCollections: updateTime.allowedCollections,
              postTimingId: updateTime.postTimingId,
              disallowedCollections: ruleDetail.disallowedCollections,
              allowZeroQuantity: ruleDetail.allowZeroQuantity,
              postingProductOrder: ruleDetail.postingProductOrder,
              isStoreDeleted: false
            },
            upsert: true
          }
        }
      });
      let updates;
      try {
        updates = await UpdateModel.bulkWrite([].concat.apply([], bulkUpdatesWrite));
      } catch (error) {
        console.error("TCL: error.message", error.message)
        if (error.message.indexOf('E11000') >= 0) {
          await sqsHelper.addToQueue('CreateUpdates', event);
        }
      }
      // scheduleState is set seperately because there may be some updates that are updated. so scheduleState is updated for only newly created updates.
      if (!_.isUndefined(updates)) {
        if (updates.result.nUpserted > 0) {
          const bulkUpdate = updates.result.upserted.map(updateTime => {
            return {
              updateOne: {
                filter: { _id: updateTime._id },
                update: {
                  scheduleState: NOT_SCHEDULED
                }
              }
            }
          });
          const updateUpdates = await UpdateModel.bulkWrite(bulkUpdate);
        }
      }
    }
    if (event.ruleIdForScheduler) {
      if (process.env.IS_OFFLINE === 'false') {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: event.ruleIdForScheduler });
      } else {
        await scheduleClass.schedule({ ruleId: event.ruleIdForScheduler }, context);
      }
    }
  },
  deleteScheduledUpdates: async function (ruleId) {
    const UpdateModel = shared.UpdateModel;
    const updatesDeleted = await UpdateModel.deleteMany(
      {
        rule: ruleId,
        scheduleState: { $in: [NOT_SCHEDULED, PENDING, APPROVED] },
        scheduleTime: { $gte: moment().utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
      }
    )
    // const ProductModel = shared.ProductModel;
    // const RuleModel = shared.RuleModel;
    // const ruleDetail = await RuleModel.findOne({ _id: ruleId });
    // const ruleUpdates = await UpdateModel.find({ rule: ruleId, scheduleState: { $in: [PENDING, APPROVED] } }).select('product');


    // if (!_.isNull(ruleUpdates)) {
    //   const items = await ProductModel.find({ _id: { $in: ruleUpdates.map(update => update['product']) } })

    //   let updateItemShareHistory = [];
    //   const updateProducts = items.map(item => {
    //     updateItemShareHistory = [];
    //     updateItemShareHistory = item.shareHistory.map(itemScheduleHistory => {
    //       if ((ruleDetail.profile.toString() === itemScheduleHistory.profile.toString()) && (ruleDetail.type === itemScheduleHistory.postType)) {
    //         if (itemScheduleHistory.counter === 1) {
    //           return undefined
    //         } else {
    //           return {
    //             profile: itemScheduleHistory.profile,
    //             postType: itemScheduleHistory.postType,
    //             counter: (itemScheduleHistory.counter) > 0 ? itemScheduleHistory.counter - 1 : 0
    //           }
    //         }
    //       } else {
    //         return itemScheduleHistory
    //       }
    //     }).filter(item => !_.isUndefined(item));


    //     return {
    //       updateOne: {
    //         filter: { uniqKey: item.uniqKey },
    //         update: {
    //           shareHistory: updateItemShareHistory
    //         }
    //       }
    //     }
    //   });

    //   if (!_.isEmpty(updateProducts)) {
    //     const products = await ProductModel.bulkWrite(updateProducts);
    //   }
    // }

  },
  createHistoryForProduct: async function (update) {

    const updatePostType = update.postType;
    const updateProfileId = update.profile;
    const updateProduct = update.product;
    const ruleId = update.product;
    const updateProductDetail = await ProductModel.findById(updateProduct);
    let shareHistory = updateProductDetail.shareHistory;


    // profile history for given profile in the item share history
    let profileHistory = shareHistory.map(history => {
      if (updatePostType === history.postType && history.profile && history.profile.toString() === updateProfileId.toString()) {
        return history;
      } else {
        return undefined;
      }
    }).filter(item => !_.isUndefined(item))[0];


    // if no share history is found counter is set to one. 
    if (_.isEmpty(profileHistory) || _.isUndefined(profileHistory)) {
      shareHistory[updateProductDetail.shareHistory.length] = { profile: updateProfileId, counter: 1, postType: updatePostType, rule: update.rule };
    } else {
      // otherwise counter is incremented and history is returned. 
      shareHistory = updateProductDetail.shareHistory.map(history => {
        if (history._id.toString() === profileHistory._id.toString()) {
          history.counter = history.counter + 1;
        }
        return history;
      });
    }
    // console.log("shareHistory", shareHistory)
    const updateQuery = [{
      updateOne: {
        filter: { _id: updateProduct._id },
        update: {
          shareHistory: shareHistory,
        }
      }
    }];
    const productUpdates = await ProductModel.bulkWrite(updateQuery);

  }
}

const shared = require('shared');
const _ = require('lodash');
const moment = require('moment-timezone');
const {
  NOT_SCHEDULED,
  SCHEDULE_TYPE_PRODUCT,
  SCHEDULE_TYPE_VARIANT,
  PENDING,
  APPROVED,
} = require('shared/constants');
module.exports = {
  createUpdatesforThisWeek: async function (event) {
    console.log("TCL: event", event)
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const ProductModel = shared.ProductModel;
    const activeRules = await RuleModel.find({ active: true });
    console.log("TCL: activeRules.length", activeRules.length)
    const scheduleWeekRules = await UpdateModel.distinct('rule',
      {
        scheduleTime: { $gt: moment.utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
      }
    );
    console.log("TCL: scheduleWeekRules.length", scheduleWeekRules.length)
    const scheduleWeekRuleId = scheduleWeekRules.map(ruleId => ruleId.toString());
    const rules = activeRules.filter(x => !scheduleWeekRuleId.includes(x._id.toString()));
    console.log("TCL: rules", rules)
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
    console.log("TCL: dbCollectionsUpdate", dbCollectionsUpdate)
  },
  createUpdatesforNextWeek: async function (event, context) {
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const activeRules = await RuleModel.find({ active: true }).select('_id');
    console.log("TCL: activeRules", activeRules)
    const scheduleWeekRules = await UpdateModel.distinct('rule',
      {
        scheduleTime: { $gt: moment().add(1, 'weeks').startOf('isoWeek') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
      }
    );
    console.log("TCL: scheduleWeekRules", scheduleWeekRules)
    const scheduleWeekRuleId = scheduleWeekRules.map(ruleId => ruleId.toString());
    const rules = activeRules.filter(x => !scheduleWeekRuleId.includes(x._id.toString()));
    console.log("TCL: rules", rules)
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
  createUpdates: async function (event, context) {
    console.log("TCL: event", event)
    let updateTimes = [];
    let startOfWeek, endOfWeek;
    const RuleModel = shared.RuleModel;
    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;
    const scheduleClass = shared.scheduleClass;
    const ruleDetail = await RuleModel.findById(event.ruleId).populate('profile');
    if (ruleDetail === null) {
      throw new Error(`rule not found for ${event.ruleId}`);
    }
    const storeDetail = await StoreModel.findById(ruleDetail.store);
    console.log("TCL: ruleDetail.store", storeDetail._id)
    console.log("TCL: ruleDetail.store.title", storeDetail.title)
    if (event.scheduleWeek === 'next') {
      startOfWeek = moment().add(1, 'weeks').tz(storeDetail.timezone).startOf('isoWeek');
      endOfWeek = moment().add(1, 'weeks').tz(storeDetail.timezone).endOf('isoWeek');
    } else if (!_.isUndefined(event.scheduleWeek)) {
      startOfWeek = moment(event.scheduleWeek);
      endOfWeek = moment(event.scheduleWeek).add(7, 'days');
    } else {
      startOfWeek = moment().tz(storeDetail.timezone).startOf('isoWeek')
      endOfWeek = moment().tz(storeDetail.timezone).endOf('isoWeek');
    }
    console.log("TCL: startOfWeek", startOfWeek.toISOString())
    console.log("TCL: endOfWeek", endOfWeek.toISOString())

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

    console.log("TCL: -------------------------")
    console.log("TCL: updateTimes.length", updateTimes.length)
    console.log("TCL: -------------------------")
    if (updateTimes.length > 0) {
      const profile = ruleDetail.profile;
      const bulkUpdatesWrite = updateTimes.map(updateTime => {
        // console.log("TCL: updateTime", updateTime);
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
            },
            upsert: true
          }
        }
      });

      const updates = await UpdateModel.bulkWrite([].concat.apply([], bulkUpdatesWrite));
      // scheduleState is set seperately because there may be some updates that are updated. so scheduleState is updated for only newly created updates.
      console.log("TCL: -------------------------")
      console.log("TCL: updates.result.nUpserted", updates.result.nUpserted)
      console.log("TCL: -------------------------")
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
    console.log("TCL: event.ruleIdForScheduler", event.ruleIdForScheduler)
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
    const ProductModel = shared.ProductModel;
    const RuleModel = shared.RuleModel;
    const ruleDetail = await RuleModel.findOne({ _id: ruleId });
    console.log("TCL: ruleDetail", ruleDetail.profile)
    const ruleUpdates = await UpdateModel.find({ rule: ruleId, scheduleState: { $in: [PENDING, APPROVED] } }).select('product');


    if (!_.isNull(ruleUpdates)) {
      const items = await ProductModel.find({ _id: { $in: ruleUpdates.map(update => update['product']) } })

      let updateItemShareHistory = [];
      const updateProducts = items.map(item => {
        updateItemShareHistory = [];
        console.log("TCL: item.shareHistory", item.shareHistory)
        updateItemShareHistory = item.shareHistory.map(itemScheduleHistory => {
          console.log("TCL: itemScheduleHistory", itemScheduleHistory)
          if ((ruleDetail.profile.toString() === itemScheduleHistory.profile.toString()) && (ruleDetail.type === itemScheduleHistory.postType)) {
            return {
              profile: itemScheduleHistory.profile,
              postType: itemScheduleHistory.postType,
              counter: itemScheduleHistory.counter - 1
            }
          } else {
            return itemScheduleHistory
          }
        });

        console.log("TCL: updateItemShareHistory", updateItemShareHistory)
        return {
          updateOne: {
            filter: { uniqKey: item.uniqKey },
            update: {
              shareHistory: updateItemShareHistory
            }
          }
        }
      });
      console.log("TCL: updateProducts", updateProducts)
      if (!_.isEmpty(updateProducts)) {
        const products = await ProductModel.bulkWrite(updateProducts);
      }
      const updatesDeleted = await UpdateModel.deleteMany(
        {
          rule: ruleId,
          scheduleState: { $in: [NOT_SCHEDULED, PENDING, APPROVED] },
          scheduleTime: { $gte: moment().utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        })
    }
  }
}
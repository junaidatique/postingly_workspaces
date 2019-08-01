const shared = require('shared');
const moment = require('moment-timezone');
// const momentTz = require('moment-timezone');
const { NOT_SCHEDULED, PENDING, POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS, SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT } = require('shared/constants');

module.exports = {
  createUpdates: async function (event, context) {
    try {
      let updateTimes = [];
      let startOfWeek, endOfWeek;
      const RuleModel = shared.RuleModel;
      const StoreModel = shared.StoreModel;
      const UpdateModel = shared.UpdateModel;
      const ruleDetail = await RuleModel.findById(event.ruleId);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }
      const storeDetail = await StoreModel.findById(ruleDetail.store);
      if (event.scheduleWeek == 'next') {
        startOfWeek = moment().add(1, 'weeks').tz(storeDetail.timezone).startOf('isoWeek');
        endOfWeek = moment().add(1, 'weeks').tz(storeDetail.timezone).endOf('isoWeek');
      } else {
        // startOfWeek = moment.unix(moment().unix() - (moment().unix() % (ruleDetail.postTimings[0].postingInterval * 60)));
        startOfWeek = moment().tz(storeDetail.timezone).startOf('isoWeek')
        endOfWeek = moment().tz(storeDetail.timezone).endOf('isoWeek');
      }
      if (ruleDetail.postingTimeOption === POST_IMMEDIATELY) {
        for (let loopTime = startOfWeek; loopTime.isBefore(endOfWeek); loopTime = loopTime.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
          if (loopTime.isAfter(moment.utc()) && ruleDetail.postTimings[0].postingDays.includes(moment.weekdays(loopTime.weekday()))) {
            updateTimes.push(loopTime.toISOString());
          }
        }
      } else if (ruleDetail.postingTimeOption === POST_BETWEEN_WITH_INTERVAL) {
        for (let day = startOfWeek; day <= endOfWeek; day = day.add(1, 'day')) {
          const startHour = day.clone().set('hour', ruleDetail.postTimings[0].startPostingHour).set('minute', 0);
          const endHour = day.clone().set('hour', ruleDetail.postTimings[0].endPostingHour).set('minute', 0);
          for (let loopTime = startHour; loopTime <= endHour; loopTime = loopTime.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
            if (loopTime.isAfter(moment.utc()) && ruleDetail.postTimings[0].postingDays.includes(moment.weekdays(loopTime.weekday()))) {
              updateTimes.push(loopTime.toISOString());
            }
          }
        }
      } else if (ruleDetail.postingTimeOption === CUSTOM_TIMINGS) {
        ruleDetail.postTimings.forEach((postTime) => {
          for (let loopTime = startOfWeek.clone(); loopTime.isBefore(endOfWeek); loopTime = loopTime.add(1, 'day')) {
            hour = loopTime.set({ 'hour': postTime.postingHour, 'minute': postTime.postingMinute });
            if (hour.isAfter(moment.utc()) && postTime.postingDays.includes(moment.weekdays(loopTime.weekday()))) {
              updateTimes.push(hour.toISOString());
            }
          }
        });
      }
      const r = await UpdateModel.deleteMany(
        {
          store: storeDetail._id,
          rule: ruleDetail._id,
          scheduleTime: { $gte: moment().utc(), $lte: endOfWeek },
          scheduleState: { $in: [NOT_SCHEDULED, PENDING] }
        }
      );
      if (updateTimes.length > 0) {
        const bulkUpdatesWrite = updateTimes.map(updateTime => {
          return ruleDetail.profiles.map(profile => {
            return {
              updateOne: {
                filter: { uniqKey: `${ruleDetail.id}-${profile}-${updateTime}` },
                update: {
                  store: storeDetail._id,
                  rule: ruleDetail._id,
                  profile: profile,
                  service: ruleDetail.service,
                  postAsOption: ruleDetail.postAsOption,
                  scheduleTime: updateTime,
                  postType: ruleDetail.type,
                  scheduleType: (ruleDetail.postAsVariants) ? SCHEDULE_TYPE_VARIANT : SCHEDULE_TYPE_PRODUCT,
                  autoApproveUpdates: storeDetail.autoApproveUpdates,
                  autoAddCaptionOfUpdates: storeDetail.autoAddCaptionOfUpdates,
                  captionsUpdated: false,
                  userEdited: false
                },
                upsert: true
              }
            }
          });
        });
        const updates = await UpdateModel.bulkWrite([].concat.apply([], bulkUpdatesWrite));
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

    } catch (error) {
      console.error(error);
      console.error(error.message);
    }

  }
}
const shared = require('shared');
const moment = require('moment');
const { NOT_SCHEDULED, PENDING, POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS, SCHEDULE_TYPE_PRODUCT } = require('shared/constants');

module.exports = {
  createUpdates: async function (event, context) {
    try {
      let updateTimes = [];
      let startTime, endTime;
      const RuleModel = shared.RuleModel;
      const StoreModel = shared.StoreModel;
      const UpdateModel = shared.UpdateModel;
      const ruleDetail = await RuleModel.findById(event.id);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.id}`);
      }
      const storeDetail = await StoreModel.findById(ruleDetail.store);
      if (ruleDetail.postingTimeOption === POST_IMMEDIATELY) {
        let startOfWeek;
        if (event.scheduleWeek == 'next') {
          startOfWeek = moment().utc().startOf('isoWeek');
        } else {
          startOfWeek = moment.unix(moment().unix() - (moment().unix() % (ruleDetail.postTimings[0].postingInterval * 60)));
        }
        const endOfWeek = moment().utc().endOf('isoWeek');
        startTime = startOfWeek;
        endTime = endOfWeek;
        for (let loopTime = startOfWeek; loopTime.isBefore(endOfWeek); loopTime = loopTime.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
          if (loopTime.isAfter(moment.utc()) && ruleDetail.postTimings[0].postingDays.includes(moment.weekdays(loopTime.weekday()))) {
            updateTimes.push(loopTime.toISOString());
          }
        }
      } else if (ruleDetail.postingTimeOption === POST_BETWEEN_WITH_INTERVAL) {
        const startOfWeek = moment().startOf('isoWeek').unix();
        const endOfWeek = moment().endOf('isoWeek').unix();
        startTime = startOfWeek;
        endTime = endOfWeek;

        let currentDay;
        for (let day = startOfWeek; day <= endOfWeek; day = day + 86400) {
          currentDay = moment.unix(day);
          const startHour = moment().year(currentDay.year()).month(currentDay.month()).date(currentDay.date()).hour(ruleDetail.postTimings[0].startPostingHour).minute(0).second(0);
          const endHour = moment().year(currentDay.year()).month(currentDay.month()).date(currentDay.date()).hour(ruleDetail.postTimings[0].endPostingHour).minute(0).second(0);
          for (let hour = startHour; hour <= endHour; hour = hour.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
            if (hour.isAfter(moment.utc()) && ruleDetail.postTimings[0].postingDays.includes(moment.weekdays(hour.weekday()))) {
              // if (hour.isAfter(moment.utc())) {
              updateTimes.push(hour.toISOString());
            }
          }
        }
      } else if (ruleDetail.postingTimeOption === CUSTOM_TIMINGS) {
        startTime = moment().utc().toDate();
        endTime = moment().endOf('isoWeek').toDate();

        const startOfWeek = moment().startOf('isoWeek').unix();
        let postDay, hour;
        ruleDetail.postTimings.forEach((postTime) => {
          postTime.postingDays.forEach((postDay) => {
            postDay = moment.unix(startOfWeek + (86400 * (postDay - 1)));
            hour = moment().year(postDay.year()).month(postDay.month()).date(postDay.date()).hour(postTime.postingHour).minute(postTime.postingMinute).second(0);
            updateTimes.push(hour.toISOString());

          })
        });
      }
      const r = await UpdateModel.deleteMany(
        {
          store: storeDetail._id,
          rule: ruleDetail._id,
          scheduleTime: { $gte: startTime, $lte: endTime },
          scheduleState: { $in: [NOT_SCHEDULED, PENDING] }
        }
      );
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
                scheduleType: SCHEDULE_TYPE_PRODUCT,
                autoApproveUpdates: storeDetail.autoApproveUpdates,
                autoAddCaptionOfUpdates: storeDetail.autoAddCaptionOfUpdates,
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
    } catch (error) {
      console.error(error.message);
    }

  }
}
const shared = require('shared');
const moment = require('moment');

module.exports = {
  createUpdates: async function (event, context) {
    try {
      const RuleModel = shared.RuleModel;
      const StoreModel = shared.StoreModel;
      const UpdateModel = shared.UpdateModel;
      const ruleDetail = await RuleModel.findById(event.id);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.id}`);
      }
      const storeDetail = await StoreModel.findById(ruleDetail.store);
      if (ruleDetail.postingTimeOption === 'postImmediately') {
        let startOfWeek;
        if (event.scheduleWeek == 'next') {
          startOfWeek = moment().utc().startOf('isoWeek');
        } else {
          startOfWeek = moment.unix(moment().unix() - (moment().unix() % (ruleDetail.postTimings[0].postingInterval * 60)));
        }
        const endOfWeek = moment().utc().endOf('isoWeek');
        const r = await UpdateModel.deleteMany(
          {
            store: storeDetail._id,
            rule: ruleDetail._id,
            scheduleTime: { $gte: startOfWeek.toDate(), $lte: endOfWeek.toDate() },
            scheduleState: { $in: ['not_scheduled', 'scheduled'] }
          }
        );
        for (let loopTime = startOfWeek; loopTime.isBefore(endOfWeek); loopTime = loopTime.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
          if (loopTime.isAfter(moment.utc())) {
            UpdateModel.create(
              {
                store: storeDetail._id,
                rule: ruleDetail._id,
                service: ruleDetail.service,
                postAsOption: ruleDetail.postAsOption,
                scheduleTime: loopTime.toISOString(),
                scheduleState: 'not_scheduled',
                postType: ruleDetail.type,
              })
          }
        }
      } else if (ruleDetail.postingTimeOption === 'postBetweenWithInterval') {
        const startOfWeek = moment().startOf('isoWeek').unix();
        const endOfWeek = moment().endOf('isoWeek').unix();
        const r = await UpdateModel.deleteMany(
          {
            store: storeDetail._id,
            rule: ruleDetail._id,
            scheduleTime: { $gte: moment().utc().toDate(), $lte: moment().endOf('isoWeek').toDate() },
            scheduleState: { $in: ['not_scheduled', 'scheduled'] }
          }
        );
        // console.log(r);
        let currentDay;
        for (let day = startOfWeek; day <= endOfWeek; day = day + 86400) {
          currentDay = moment.unix(day);
          const startHour = moment().year(currentDay.year()).month(currentDay.month()).date(currentDay.date()).hour(ruleDetail.postTimings[0].startPostingHour).minute(0).second(0);
          const endHour = moment().year(currentDay.year()).month(currentDay.month()).date(currentDay.date()).hour(ruleDetail.postTimings[0].endPostingHour).minute(0).second(0);
          for (let hour = startHour; hour <= endHour; hour = hour.add(ruleDetail.postTimings[0].postingInterval, 'minute')) {
            if (hour.isAfter(moment.utc())) {
              UpdateModel.create(
                {
                  store: storeDetail._id,
                  rule: ruleDetail._id,
                  service: ruleDetail.service,
                  postAsOption: ruleDetail.postAsOption,
                  scheduleTime: hour.toISOString(),
                  scheduleState: 'not_scheduled',
                  postType: ruleDetail.type,
                })
            }
          }
        }
      } else if (ruleDetail.postingTimeOption === 'customTimings') {
        const r = await UpdateModel.deleteMany(
          {
            store: storeDetail._id,
            rule: ruleDetail._id,
            scheduleTime: { $gte: moment().utc().toDate(), $lte: moment().endOf('isoWeek').toDate() },
            scheduleState: { $in: ['not_scheduled', 'scheduled'] }
          }
        );
        const startOfWeek = moment().startOf('isoWeek').unix();
        let postDay, hour;
        ruleDetail.postTimings.forEach((postTime) => {
          postTime.postingDays.forEach((postDay) => {
            postDay = moment.unix(startOfWeek + (86400 * (postDay - 1)));
            hour = moment().year(postDay.year()).month(postDay.month()).date(postDay.date()).hour(postTime.postingHour).minute(postTime.postingMinute).second(0);
            UpdateModel.create(
              {
                store: storeDetail._id,
                rule: ruleDetail._id,
                service: ruleDetail.service,
                postAsOption: ruleDetail.postAsOption,
                scheduleTime: hour.toISOString(),
                scheduleState: 'not_scheduled',
                postType: ruleDetail.type,
              })
          })
        });
      }
    } catch (error) {
      console.error(error.message);
    }

  }
}
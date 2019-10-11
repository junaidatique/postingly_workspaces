const shared = require('shared');
const moment = require('moment-timezone');
const _ = require('lodash');
const { NOT_SCHEDULED, PENDING, POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS, SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT } = require('shared/constants');
const dbConnection = require('./db');
let lambda;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
}
module.exports = {
  // event = null
  createUpdatesforNextWeek: async function (event, context) {
    await dbConnection.createConnection(context);
    try {
      const RuleModel = shared.RuleModel;
      const rules = await RuleModel.find({ active: true });
      if (process.env.IS_OFFLINE === 'false') {
        await Promise.all(rules.map(async ruleDetail => {
          const params = {
            FunctionName: `postingly-functions-${process.env.STAGE}-create-updates`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ ruleId: ruleDetail._id, scheduleWeek: 'next' })
          };
          console.log("TCL: lambda.invoke params", params)
          const lambdaResponse = await lambda.invoke(params).promise();
          console.log("TCL: lambdaResponse", lambdaResponse)

        }));
      } else {
        console.log("TCL: createUpdatesforNextWeek event", event)
      }
    } catch (error) {
      console.error(error);
      console.error(error.message);
    }
  },
  // event = { ruleId: ruleDetail._id, scheduleWeek: "next" | null }
  createUpdates: async function (event, context) {
    console.log("TCL: event", event)
    await dbConnection.createConnection(context);
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
      if (event.scheduleWeek === 'next') {
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
      // const r = await UpdateModel.deleteMany(
      //   {
      //     store: storeDetail._id,
      //     rule: ruleDetail._id,
      //     scheduleTime: { $gte: moment().utc(), $lte: endOfWeek },
      //     scheduleState: { $in: [NOT_SCHEDULED, PENDING] }
      //   }
      // );
      if (updateTimes.length > 0) {
        const bulkUpdatesWrite = updateTimes.map(updateTime => {
          return ruleDetail.profiles.map(profile => {
            return {
              updateOne: {
                filter: { uniqKey: `${ruleDetail.id}-${profile}-${updateTime}` },
                update: {
                  store: storeDetail._id,
                  rule: ruleDetail._id,
                  profile: profile._id,
                  service: ruleDetail.service,
                  serviceProfile: profile.serviceProfile,
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
        // scheduleState is set seperately because there may be some updates that are updated. so scheduleState is updated for only newly created updates.
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
      if (!_.isNull(event.ruleIdForScheduler) && !_.isUndefined(event.ruleIdForScheduler)) {
        if (process.env.IS_OFFLINE === 'false') {
          const params = {
            FunctionName: `postingly-functions-${process.env.STAGE}-schedule-updates`,
            InvocationType: 'Event',
            LogType: 'Tail',
            Payload: JSON.stringify({ ruleId: event.ruleIdForScheduler })
          };
          console.log("TCL: lambda.invoke params", params)
          console.log("TCL: lambda", lambda)
          const lambdaResponse = await lambda.invoke(params).promise();
          console.log("TCL: lambdaResponse", lambdaResponse)
        } else {
          console.log("TCL: cronThisWeekRulesForUpdates event", event)
        }
      }

    } catch (error) {
      console.error(error);
      console.error(error.message);
    }

  }
}
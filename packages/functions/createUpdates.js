const shared = require('shared');
const updateClass = shared.updateClass;
const _ = require('lodash');

const dbConnection = require('./db');

module.exports = {
  // event = null
  createUpdatesForThisWeek: async function (event, context) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    await dbConnection.createConnection(context);
    await updateClass.createUpdatesForThisWeek(event);
    console.log('createUpdatesForThisWeek =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
  },
  createUpdatesforNextWeek: async function (event, context) {
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    await dbConnection.createConnection(context);
    await updateClass.createUpdatesforNextWeek(event, context);
    console.log('createUpdatesforNextWeek =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
  },
  // event = { ruleId: ruleDetail._id, scheduleWeek: "next" | datetime | undefined  }
  createUpdates: async function (eventSQS, context) {
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }
    await dbConnection.createConnection(context);
    await updateClass.createUpdates(event, context);

    console.log('createUpdatesforNextWeek =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));

  }
}
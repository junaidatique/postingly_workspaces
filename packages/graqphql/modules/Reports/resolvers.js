const shared = require('shared');
const _ = require('lodash')
const moment = require('moment')
let conn;
const query = require('shared').query
module.exports = {
  getStoreReport: async (obj, args, context, info) => {
    console.log("TCL: args", args)
    const UpdateModel = shared.UpdateModel;
    const today = moment().dayOfYear();
    const fiveDaysAgo = moment().subtract(5, 'days').dayOfYear();
    const storeReport = [];
    for (i = -4; i <= 4; i++) {
      storeReport.push({
        scheduleDayOfYear: moment().add(i, 'days').dayOfYear(),
        date: moment().add(i, 'days').format("D/M/YYY")
      })
    }
    console.log("TCL: storeReport", storeReport)
    let response;
    await Promise.all(storeReport.map(async storeReport => {
      response = await UpdateModel.aggregate([{
        "$match": {
          "scheduleDayOfYear": storeReport.scheduleDayOfYear
        }
      },
      {
        "$group": {
          "_id": "$store",
          "scheduleDayOfYear": {
            "$first": "$scheduleDayOfYear"
          }
        }
      },
      {
        "$count": "count"
      }])
      if (_.isEmpty(response)) {
        storeReport.count = 0;
      } else {
        storeReport.count = response[0].count;
      }
      console.log("TCL: response", response)
    }));
    console.log("TCL: storeReport", storeReport)

    // console.log("TCL: reposne", reposne)
    // console.log("TCL: reposne", reposne[0])
    // console.log("TCL: reposne", reposne[0].count)
    // return [{
    //   count: reposne[0].count,
    //   scheduleDayOfYear: moment().dayOfYear()
    // }]
    return storeReport;
  }


}
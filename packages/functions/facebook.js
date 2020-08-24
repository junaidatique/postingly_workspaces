const shared = require('shared');
// const sqsHelper = require('shared').sqsHelper;
const dbConnection = require('./db');
const _ = require('lodash')
module.exports = {

  getDefaultAlbum: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    await dbConnection.createConnection(context);
    const profile = await shared.ProfileModel.findById(event.profileId)
    console.log("profile", profile);
    const response = await shared.FacebookService.getDefaultAlbum(
      profile._id,
      profile.serviceUserId,
      profile.accessToken,
      null
    );
    console.log("response", response)



  },




}

const shared = require('shared');
const _ = require('lodash');
const moment = require('moment')
const {
  FACEBOOK_SERVICE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO,
  TWITTER_SERVICE, TWITTER_PROFILE, BUFFER_SERVICE, POSTED, COLLECTION_OPTION_ALL, FAILED
} = require('shared/constants');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const dbConnection = require('./db');
module.exports = {
  share: async function (eventSQS, context) {
    let event;
    console.log("TCL: shareUpdates eventSQS", eventSQS)
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: shareUpdates event", event)
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const update = await UpdateModel.findById(event.updateId);
    if (_.isNull(update) || _.isUndefined(update)) {
      return;
    }

    if (_.isNull(update.postingCollectionOption)) {
      update.scheduleState = FAILED;
      update.failedMessage = "Duplicate Post";
      await update.save();
      return;
    }
    let response;
    console.log("TCL: process.env.ENABLE_POSTING", process.env.ENABLE_POSTING)
    if (process.env.ENABLE_POSTING === 'true') {
      if (update.service === FACEBOOK_SERVICE) {
        if (update.postAsOption === POST_AS_OPTION_FB_ALBUM) {
          response = await FacebookService.shareFacebookPostAsAlbum(update);
        }
        else if (update.postAsOption === POST_AS_OPTION_FB_LINK) {
          response = await FacebookService.shareFacebookPostAsLink(update);
        }
        else if (update.postAsOption === POST_AS_OPTION_FB_PHOTO) {
          response = await FacebookService.shareFacebookPostAsPhoto(update);
        }
      } else if (update.service === TWITTER_SERVICE) {
        if (update.serviceProfile === TWITTER_PROFILE) {
          response = await TwitterService.shareTwitterPosts(update);
        }
      } else if (update.service === BUFFER_SERVICE) {
        response = await BufferService.shareProductPosts(update);
      }
      console.log("TCL: response", response)
    } else {
      response = {
        scheduleState: POSTED,
        failedMessage: null,
        response: {}
      }
    }
    if (_.isNull(update.postingCollectionOption)) {
      update.postingCollectionOption = COLLECTION_OPTION_ALL;
    }
    update.postingCollectionOption = COLLECTION_OPTION_ALL;
    update.scheduleState = response.scheduleState;
    update.failedMessage = response.failedMessage;
    update.response = response.response;
    update.postingTime = moment().toISOString();
    await update.save();
  },

}
const shared = require('shared');
const {
  FACEBOOK_SERVICE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO,
  TWITTER_SERVICE, TWITTER_PROFILE, BUFFER_SERVICE
} = require('shared/constants');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const dbConnection = require('./db');
module.exports = {
  share: async function (event, context) {
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const update = await UpdateModel.findById(event.updateId);
    let response;
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
    update.scheduleState = response.scheduleState;
    update.failedMessage = response.failedMessage;
    update.response = response.response;
    await update.save();
  },

}
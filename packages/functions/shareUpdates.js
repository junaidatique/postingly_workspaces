const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { POSTED, FACEBOOK_SERVICE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO } = require('shared/constants');
const FacebookService = require('shared').FacebookService;

module.exports = {
  share: async function (event, context) {
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
    }
    console.log("TCL: response", response)
    update.scheduleState = response.scheduleState;
    update.failedMessage = response.failedMessage;
    update.response = response.response;
    await update.save();
  },

}
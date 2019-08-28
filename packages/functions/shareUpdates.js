const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { POSTED, FACEBOOK_SERVICE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO } = require('shared/constants');
const FacebookService = require('shared').FacebookService;
const mongoose = require('mongoose');
let conn = null;
module.exports = {
  share: async function (event, context) {
    context.callbackWaitsForEmptyEventLoop = false;
    if (conn == null) {
      conn = await mongoose.createConnection(process.env.MONGODB_URL, {
        useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
        bufferMaxEntries: 0
      });
    }
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
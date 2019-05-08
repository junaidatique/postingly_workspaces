const fb = require('./services/facebook');
const { FACEBOOK_SERVICE } = require('./constants');
module.exports = {
  connect: async function (event, context) {
    let response = {};
    try {
      if (event.service == FACEBOOK_SERVICE) {
        response = await fb.login(event.storeId, event.code, event.serviceProfile);
      } else {

      }
      context.done(null, response);
    } catch (erroror) {
      context.done(error.message, null);
    }

  },
  getProfile: async function (event, context) {
    let response = {};
    try {
      if (event.service == FACEBOOK_SERVICE) {
        response = await fb.getProfile(event.storeId, event.accessToken, event.serviceProfile);
      } else {

      }
      context.done(null, response);
    } catch (error) {
      context.done(error, null);
    }
  }
};

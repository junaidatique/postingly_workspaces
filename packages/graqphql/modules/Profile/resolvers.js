const fbConnect = require('./services/facebook');
const { FACEBOOK_SERVICE, TEST } = require("../../constants");
const formattedProfile = require('./functions').formattedProfile
module.exports = {
  connectProfile: async (obj, args, context, info) => {
    if (args.input.service === FACEBOOK_SERVICE) {
      if (process.env.STAGE == TEST) {
        response = await fbConnect.getProfile(args.input.storeId, args.input.code, args.input.serviceProfile);
      } else {
        response = await fbConnect.login(args.input.storeId, args.input.code, args.input.serviceProfile);
      }
    } else {

    }
    return response.map(profile => {
      return formattedProfile(profile);
    })
  }
}
const shared = require('shared');
// const sqsHelper = require('shared').sqsHelper;
const dbConnection = require('./db');
module.exports = {

  getDefaultAlbum: async function (event, context) {
    await dbConnection.createConnection(context);
    const profile = await shared.ProfileModel.findById(event.profileId)
    // await Promise.all(profiles.map(async profile => {
    //   await 
    // }))
    // const response = await shared.FacebookService.getDefaultAlbum(
    //   profiles[0]._id,
    //   profiles[0].serviceUserId,
    //   profiles[0].accessToken,
    //   null
    // );
    // const profile = await shared.ProfileModel.findById('5ee646efa302080a30633108')
    const response = await shared.FacebookService.getDefaultAlbum(
      profile._id,
      profile.serviceUserId,
      profile.accessToken,
      null
    );
    console.log("response", response)



  },




}

const IgApiClient = require('instagram-private-api').IgApiClient;
const IgCheckpointError = require('instagram-private-api').IgCheckpointError;
// const get = require('request-promise').get;
const Bluebird = require('bluebird');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;

const { INSTAGRAM_SERVICE, INSTAGRAM_PROFILE } = require('shared/constants');
module.exports = {
  login: async function (storeId, username, password) {
    const ig = new IgApiClient();
    ig.state.generateDevice(username);
    ig.state.proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_IP}:${process.env.PROXY_PORT}`;
    await ig.simulate.preLoginFlow();
    try {
      const loggedInUser = await ig.account.login(username, password);
      console.log("loggedInUser", loggedInUser)
      await this.createProfile(storeId, loggedInUser, password)
      return { status: 200, message: "You are now connected" }
    } catch (error) {
      console.log("error", error.message)
      const errorMessage = error.message.split(';')[1].trim();
      if (errorMessage === 'challenge_required') {
        console.log("ig.state.checkpoint", ig.state.checkpoint)
        await ig.challenge.auto(true);
        console.log("ig.state.checkpoint", ig.state.checkpoint)
        return { status: 400, message: 'challenge_required' }
      } else {
        return { status: 400, message: "Please make sure you have entered the right username and password. Please verify on instagram that it was you." }
      }
    }
  },
  challengeRequired: async function (storeId, username, password, verificationCode) {
    console.log("verificationCode", verificationCode)
    const ig = new IgApiClient();
    ig.state.generateDevice(username);
    let authUser;
    Bluebird.try(async () => {
      authUser = await ig.account.login(username, password);
      console.log("authUser", authUser)
      await this.createProfile(storeId, authUser, password)
      return { status: 200, message: "You are now connected" }
    }).catch(IgCheckpointError, async () => {
      console.log(ig.state.checkpoint);
      await ig.challenge.auto(true);
      console.log(ig.state.checkpoint);
      const codeResponse = await ig.challenge.sendSecurityCode(verificationCode);
      console.log("codeResponse", codeResponse)
      await this.createProfile(storeId, codeResponse.logged_in_user, password)
      return { status: 200, message: "Connected" }
    }).catch(e => {
      console.log('Could not resolve checkpoint:', e, e.stack);
      return { status: 400, message: "Please try again." }
    });
    console.log("authUser", authUser)
    if (authUser) {
      await this.createProfile(storeId, authUser, password)
    }
    return { status: 400, message: 'no idea' }
  },
  createProfile: async function (storeId, userResponse, password) {
    const uniqKey = `${INSTAGRAM_PROFILE}-${storeId}-${userResponse.pk}`;
    console.log("uniqKey", uniqKey)
    let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
    console.log("profile", profile)

    if (profile === null) {
      const userParams = {
        uniqKey: uniqKey,
        name: userResponse.full_name,
        avatarUrl: userResponse.profile_pic_url,
        serviceUserId: userResponse.pk,
        profileURL: `https://instagram.com/${userResponse.username}`,
        accessToken: password,
        service: INSTAGRAM_SERVICE,
        serviceProfile: INSTAGRAM_PROFILE,
        isConnected: true,
        isTokenExpired: false,
        isSharePossible: false,
        store: storeId
      };
      const profileInstance = new ProfileModel(userParams);
      profile = await profileInstance.save();
      console.log("profile", profile)
      const storeDetail = await StoreModel.findById(storeId);
      await storeDetail.profiles.push(profile);
    }
    return profile;
  }
}
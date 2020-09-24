const IgApiClient = require('instagram-private-api').IgApiClient;
const IgCheckpointError = require('instagram-private-api').IgCheckpointError;
const get = require('request-promise').get;
const Bluebird = require('bluebird');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;

const { INSTAGRAM_SERVICE, INSTAGRAM_PROFILE, FAILED, POSTED } = require('shared/constants');
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
    ig.state.proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_IP}:${process.env.PROXY_PORT}`;
    let authUser;

    try {
      authUser = await ig.account.login(username, password);
      console.log("authUser", authUser)
      await this.createProfile(storeId, authUser, password)
      return { status: 200, message: "You are now connected" }
    } catch (IgCheckpointError) {
      try {
        console.log(ig.state.checkpoint);
        await ig.challenge.auto(true);
        console.log(ig.state.checkpoint);
        const codeResponse = await ig.challenge.sendSecurityCode(verificationCode);
        console.log("codeResponse", codeResponse)
        await this.createProfile(storeId, codeResponse.logged_in_user, password)
        return { status: 200, message: "Connected" }
      } catch (e) {
        console.log('Could not resolve checkpoint:');
        return { status: 400, message: "Invalid Code. Please try again." }
      }
    }



  },
  createProfile: async function (storeId, userResponse, password) {
    const uniqKey = `${INSTAGRAM_PROFILE}-${storeId}-${userResponse.pk}`;
    console.log("uniqKey", uniqKey)
    let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
    console.log("profile", profile)

    const userParams = {
      uniqKey: uniqKey,
      name: userResponse.full_name,
      avatarUrl: userResponse.profile_pic_url,
      serviceUsername: userResponse.username,
      serviceUserId: userResponse.pk,
      profileURL: `https://instagram.com/${userResponse.username}`,
      accessToken: password,
      service: INSTAGRAM_SERVICE,
      serviceProfile: INSTAGRAM_PROFILE,
      isConnected: true,
      isTokenExpired: false,
      isSharePossible: true,
      store: storeId
    };
    if (profile === null) {
      const profileInstance = new ProfileModel(userParams);
      profile = await profileInstance.save();
      console.log("profile", profile)
      const storeDetail = await StoreModel.findById(storeId);
      storeDetail.profiles = [...storeDetail.profiles, profile._id];
      const response = await storeDetail.save();
      console.log("response", response)
    } else {
      await ProfileModel.updateOne({ _id: profile._id }, userParams)
    }
    return profile;
  },
  shareProductPosts: async function (update) {
    const profile = await ProfileModel.findById(update.profile);
    const imageUrl = `https://posting.ly/buffer_image?url=${update.images[0].url}`;
    try {
      const ig = new IgApiClient();
      ig.state.generateDevice(profile.serviceUsername);
      ig.state.proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_IP}:${process.env.PROXY_PORT}`;
      await ig.simulate.preLoginFlow();
      const loggedInUser = await ig.account.login(profile.serviceUsername, profile.accessToken);
      console.log("loggedInUser", loggedInUser.username)
      await ig.simulate.postLoginFlow();

      const imageBuffer = await get({
        url: imageUrl,
        encoding: null,
      });

      const publishResult = await ig.publish.photo({
        file: imageBuffer,
        caption: update.text,
      });
      console.log("publishResult", publishResult.media)
      console.log("publishResult", publishResult.media.image_versions2)
      console.log("publishResult", publishResult.media.image_versions2.candidates[0])
      return {
        scheduleState: POSTED,
        response: {
          url: publishResult.media.image_versions2.candidates[0].url,
        },
        failedMessage: null
      };

    } catch (e) {
      console.log("e.message", e.message)
      return {
        scheduleState: FAILED,
        failedMessage: e.message.split(';')[1].trim(),
        response: null,
      }
    }
  }
}
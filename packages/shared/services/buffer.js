const _ = require('lodash');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const VariantModel = require('shared').VariantModel;
const ProductModel = require('shared').ProductModel;
const querystring = require('qs');
const {
  BUFFER_SERVICE, BUFFER_API_URL, POSTED, FAILED, BUFFER_PROFILE,
  BUFFER_TWITTER_PROFILE, BUFFER_FACEBOOK_PAGE, BUFFER_FACEBOOK_GROUP,
  BUFFER_INSTAGRAM_PROFILE, BUFFER_INSTAGRAM_BUSINESS,
  BUFFER_LINKEDIN_PROFILE, BUFFER_LINKEDIN_PAGE, BUFFER_LINKEDIN_GROUP,
  SCHEDULE_TYPE_VARIANT
} = require('shared/constants');
const fetch = require('node-fetch');
const oauth = require('oauth');
var oauth2 = new oauth.OAuth2(process.env.BUFFER_APP_ID,
  process.env.BUFFER_APP_SECRET,
  BUFFER_API_URL,
  'oauth2/authorize',
  'oauth2/token.json',
  null);
module.exports = {
  getAccessToken: async function (code) {
    return new Promise((resolve, reject) => {
      oauth2.getOAuthAccessToken(
        code,
        {
          client_id: process.env.BUFFER_APP_ID,
          client_secret: process.env.BUFFER_APP_SECRET,
          redirect_uri: `${process.env.FRONTEND_URL}buffer-callback/`,
          grant_type: 'authorization_code'
        },
        (error, access_token, refresh_token, results) => {
          resolve(
            {
              accessToken: access_token
            }
          )
        });
    });
  },
  getProfile: async function (storeId, code, serviceProfile) {
    const tokenResponse = await this.getAccessToken(code);
    const userResponse = await fetch(`${BUFFER_API_URL}user.json?access_token=${tokenResponse.accessToken}`).then(response => response.json());
    console.log("TCL: getProfile userResponse", userResponse)

    const uniqKey = `${BUFFER_PROFILE}-${storeId}-${userResponse.id}`;
    let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
    if (profile === null) {
      const userParams = {
        uniqKey: `${BUFFER_PROFILE}-${storeId}-${userResponse.id}`,
        name: userResponse.name,
        avatarUrl: null,
        serviceUserId: userResponse.id,
        profileURL: null,
        accessToken: tokenResponse.accessToken,
        accessTokenSecret: null,
        service: BUFFER_SERVICE,
        serviceProfile: BUFFER_PROFILE,
        isConnected: false,
        isTokenExpired: false,
        isSharePossible: false,
        store: storeId
      };
      const profileInstance = new ProfileModel(userParams);
      profile = await profileInstance.save();
      const storeDetail = await StoreModel.findById(storeId);
      storeDetail.profiles = [...storeDetail.profiles, profile._id];
      const s = await storeDetail.save();
    } else {
      profile.accessToken = tokenResponse.accessToken;
      await profile.save();
    }
    const updatedProfile = await this.getUserProfiles(profile);
    console.log(" -- Buffer getUserDetail End -- ");
    return updatedProfile;
  },
  getUserProfiles: async function (bufferProfile) {
    try {
      const storeId = bufferProfile.store;
      const userResponse = await fetch(`${BUFFER_API_URL}profiles.json?access_token=${bufferProfile.accessToken}`).then(response => response.json());
      console.log("TCL: getUserProfiles userResponse", userResponse);
      if (!_.isUndefined(userResponse.error)) {
        console.log("TCL: userResponse.error", userResponse.error)
        throw new Error(userResponse.error);
      }
      const bulkProfileInsert = userResponse.map(profile => {
        let serviceProfile = null;
        let profileLink = null;
        if (profile.service === 'twitter') {
          serviceProfile = BUFFER_TWITTER_PROFILE;
          profileLink = `https://twitter.com/${profile.service_username}`;
        } else if (profile.service === 'facebook' && profile.service_type === 'page') {
          serviceProfile = BUFFER_FACEBOOK_PAGE;
          profileLink = `https://fb.com/${profile.service_id}`;
        } else if (profile.service === 'facebook' && profile.service_type === 'group') {
          serviceProfile = BUFFER_FACEBOOK_GROUP;
        } else if (profile.service === 'linkedin' && profile.service_type === 'profile') {
          serviceProfile = BUFFER_LINKEDIN_PROFILE;
        } else if (profile.service === 'linkedin' && profile.service_type === 'group') {
          serviceProfile = BUFFER_LINKEDIN_GROUP;
        } else if (profile.service === 'linkedin' && profile.service_type === 'page') {
          serviceProfile = BUFFER_LINKEDIN_PAGE;
        } else if (profile.service === 'instagram' && profile.service_type === 'business') {
          serviceProfile = BUFFER_INSTAGRAM_BUSINESS;
          profileLink = `https://instagram.com/${profile.service_username}`;
        } else if (profile.service === 'instagram' && profile.service_type === 'profile') {
          serviceProfile = BUFFER_INSTAGRAM_PROFILE;
          profileLink = `https://instagram.com/${profile.service_username}`;
        }
        if (!_.isNull(serviceProfile)) {
          const uniqKey = `${serviceProfile}-${storeId}-${profile.service_id}`;
          return {
            updateOne: {
              filter: { uniqKey: uniqKey },
              update: {
                name: profile.formatted_username,
                avatarUrl: profile.avatar_https,
                serviceUserId: profile.service_id,
                bufferId: profile.id,
                profileURL: profileLink,
                accessToken: bufferProfile.accessToken,
                service: BUFFER_SERVICE,
                serviceProfile: serviceProfile,
                store: storeId,
                parent: bufferProfile._id,
                isSharePossible: true,
                isConnected: false
              },
              upsert: true
            }
          }
        } else {
          return undefined;
        }
      }).filter(function (item) {
        return !_.isUndefined(item);
      });;
      console.log("TCL: bulkProfileInsert", bulkProfileInsert)
      const pageProfiles = await ProfileModel.bulkWrite(bulkProfileInsert);
      const storeProfiles = await ProfileModel.find({ store: storeId }).select('_id');
      const store = await StoreModel.findById(storeId);
      store.profiles = storeProfiles;
      await store.save();
      const childProfiles = await ProfileModel.find({ parent: bufferProfile._id }).select('_id');
      bufferProfile.children = childProfiles;
      await bufferProfile.save();
      return bufferProfile;
    } catch (error) {
      console.log(" -- Buffer getUserProfiles Error -- ");
      throw new Error(error.message);
    }
  },
  shareProductPosts: async function (update) {
    try {
      const profile = await ProfileModel.findById(update.profile);
      console.log("TCL: profile", profile)
      let productId;
      if (update.scheduleType === SCHEDULE_TYPE_VARIANT) {
        const variantDetail = await VariantModel.findById(update.variant);
        productId = variantDetail.product;
      } else {
        productId = update.product;
      }
      const productDetail = await ProductModel.findById(productId);

      const requestBody = querystring.stringify({
        profile_ids: profile.bufferId,
        text: update.text,
        media: {
          link: productDetail.partnerSpecificUrl,
          picture: update.images[0].url,
          title: productDetail.title,
          description: update.text,
          photo: update.images[0].url,
          thumbnail: update.images[0].thumbnailUrl
        },
        scheduled_at: update.scheduleTime
      })
      console.log("TCL: requestBody", requestBody)
      const bufferIRL = `${BUFFER_API_URL}updates/create.json?access_token=${profile.accessToken}`;
      console.log("TCL: bufferIRL", bufferIRL)
      const updateResponse = await fetch(bufferIRL, {
        body: requestBody,
        headers: {
          "Accept": "*/*",
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: "POST",
      }).then(response => response.json());
      console.log("TCL: updateResponse", updateResponse)
      if (updateResponse.success === true) {
        return {
          scheduleState: POSTED,
          response: {
            bufferId: updateResponse.updates[0].id,
          },
          failedMessage: null
        };
      } else {
        return {
          scheduleState: FAILED,
          failedMessage: updateResponse.message,
          response: null,
        }
      }
    } catch (error) {
      console.log(" -- Buffer sharePosts Error -- ");
      throw new Error(error.message);
    }
  }
}
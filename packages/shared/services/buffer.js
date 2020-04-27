const _ = require('lodash');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const querystring = require('qs');
const moment = require('moment');
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
      const existingStoreProfiles = await ProfileModel.find({ store: storeId, service: BUFFER_SERVICE });
      const userResponse = await fetch(`${BUFFER_API_URL}profiles.json?access_token=${bufferProfile.accessToken}`).then(response => response.json());
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
          const currentProfile = existingStoreProfiles.map(profile => (profile.uniqKey === uniqKey) ? profile : undefined).filter(item => !_.isUndefined(item))

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
                isConnected: (currentProfile[0]) ? currentProfile[0].isConnected : false,
                isTokenExpired: false
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
      const imageUrl = `https://posting.ly/buffer_image?url=${update.images[0].url}`;
      const requestBody = querystring.stringify({
        profile_ids: profile.bufferId,
        text: update.text,
        media: {
          link: update.productExternalURL,
          picture: imageUrl,
          title: update.titleForCaption,
          description: update.text,
          photo: imageUrl,
          thumbnail: update.images[0].thumbnailUrl
        },
        scheduled_at: moment(update.scheduleTime).add(5, 'minutes').toISOString()
      })
      const bufferIRL = `${BUFFER_API_URL}updates/create.json?access_token=${profile.accessToken}`;
      const updateResponse = await fetch(bufferIRL, {
        body: requestBody,
        headers: {
          "Accept": "*/*",
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: "POST",
      }).then(response => response.json());
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
  },
  getUpdates: async function (profileId, status) {
    const profileDetail = await ProfileModel.findById(profileId);
    try {
      const url = `${BUFFER_API_URL}profiles/${profileDetail.bufferId}/updates/${status}.json?count=20&access_token=${profileDetail.accessToken}`;
      const profileUpdates = await fetch(url).then(response => response.json());
      const response = {
        total: profileUpdates.total,
        updates: profileUpdates.updates.map(update => {
          return {
            id: update.id,
            day: update.day,
            dueTime: update.due_time,
            status: update.status,
            error: update.error,
            textFormatted: update.text,
            media: {
              link: update.media.link,
              description: update.media.description,
              title: update.media.title,
              thumbnail: update.media.thumbnail
            }
          }
        })
      }
      return response;
    } catch (error) {
      console.log(" -- Buffer getPendingUpdates Error -- ");
      throw new Error(error.message);
    }
  },
  deleteUpdate: async function (profileId, updateId) {
    const profileDetail = await ProfileModel.findById(profileId);
    const url = `${BUFFER_API_URL}updates/${updateId}/destroy.json?access_token=${profileDetail.accessToken}`;
    const updateResponse = await fetch(url).then(response => response.json());
    return updateResponse;
  }
}
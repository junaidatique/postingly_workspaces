const _ = require('lodash')
const oauth = require('oauth');
const Twit = require('twit');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');

const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const { TWITTER_API_URL, TWITTER_SERVICE, TWITTER_PROFILE, POSTED, FAILED } = require('shared/constants');
const consumer = new oauth.OAuth(`${TWITTER_API_URL}oauth/request_token`, `${TWITTER_API_URL}oauth/access_token`, process.env.TWITTER_API_KEY, process.env.TWITTER_API_SECRET, "1.0A", `${process.env.FRONTEND_URL}twitter-callback/`, "HMAC-SHA1");


module.exports = {
  getRequestToken: function (callback) {
    return new Promise((resolve, reject) => {
      consumer.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, results) {
        responseOauthToken = oauthToken;
        responseoauthTokenSecret = oauthTokenSecret;
        resolve(
          {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" // Required for CORS support to work
            },
            body: JSON.stringify({
              oauthToken: responseOauthToken,
              oauthTokenSecret: responseoauthTokenSecret
            })
          }

        );
      });
    });
  },
  getAccessToken: async function (oauthToken, oauthRequestTokenSecret, oauthVerifier) {
    return new Promise((resolve, reject) => {
      consumer.getOAuthAccessToken(
        oauthToken,
        oauthRequestTokenSecret,
        oauthVerifier,
        (error, oauthAccessToken, oauthAccessTokenSecret, results) => {
          resolve(
            {
              oauthAccessToken: oauthAccessToken,
              oauthAccessTokenSecret: oauthAccessTokenSecret
            }
          )
          // if (error) {
          //   logger.error(error);
          //   res.send(error, 500);
          // }
          // else {
          //   req.session.oauthAccessToken = oauthAccessToken;
          //   req.session.oauthAccessTokenSecret = oauthAccessTokenSecret
          //   return res.send({ message: 'token saved' });
          // }
        });
    });
  },
  getProfile: async function (storeId, oauthToken, oauthRequestTokenSecret, oauthVerifier) {
    const tokenResponse = await this.getAccessToken(oauthToken, oauthRequestTokenSecret, oauthVerifier);

    const T = new Twit({
      consumer_key: process.env.TWITTER_API_KEY,
      consumer_secret: process.env.TWITTER_API_SECRET,
      access_token: tokenResponse.oauthAccessToken,
      access_token_secret: tokenResponse.oauthAccessTokenSecret,
    })
    const userResponse = await T.get('account/verify_credentials');
    const uniqKey = `${TWITTER_PROFILE}-${storeId}-${userResponse.data.id}`;
    let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
    if (profile === null) {
      const userParams = {
        uniqKey: `${TWITTER_PROFILE}-${storeId}-${userResponse.data.id}`,
        name: userResponse.data.name,
        avatarUrl: userResponse.data.profile_image_url,
        serviceUserId: userResponse.data.id,
        profileURL: `https://twitter.com/${userResponse.data.screen_name}`,
        accessToken: tokenResponse.oauthAccessToken,
        accessTokenSecret: tokenResponse.oauthAccessTokenSecret,
        service: TWITTER_SERVICE,
        serviceProfile: TWITTER_PROFILE,
        isConnected: false,
        isTokenExpired: false,
        isSharePossible: true,
        store: storeId
      };
      const profileInstance = new ProfileModel(userParams);
      profile = await profileInstance.save();
      const storeDetail = await StoreModel.findById(storeId);
      storeDetail.profiles = [...storeDetail.profiles, profile._id];
      const s = await storeDetail.save();
      console.log("TCL: s", s)
    }

    console.log(" -- TW getUserDetail End -- ");
    return profile;
  },
  shareTwitterPosts: async function (update) {
    console.log("TCL: update", update)
    try {
      const profile = await ProfileModel.findById(update.profile);
      const T = new Twit({
        consumer_key: process.env.TWITTER_API_KEY,
        consumer_secret: process.env.TWITTER_API_SECRET,
        access_token: profile.accessToken,
        access_token_secret: profile.accessTokenSecret,
      });
      let image_ids = [];
      if (update.images.length > 0) {
        await Promise.all(update.images.map(async image => {
          const imageEncode = await fetch(image.url).then(r => r.buffer()).then(buf => buf.toString('base64'));
          const resp = await T.post('media/upload', { media_data: imageEncode, media_category: 'tweet_image' });
          image_ids.push(resp.data.media_id_string);

        }));
      }
      console.log("TCL: image_ids", image_ids)
      const params = { status: update.text, media_ids: image_ids }
      console.log("TCL: params", params)
      const tweetResponse = await T.post('statuses/update', params);
      console.log("TCL: tweetResponse", tweetResponse)
      return {
        scheduleState: POSTED,
        response: {
          tweetId: tweetResponse.data.id_str,
          tweetURL: `https://twitter.com/i/web/status/${tweetResponse.data.id_str}`
        },
        failedMessage: null
      };

    } catch (error) {
      return {
        scheduleState: FAILED,
        failedMessage: error.message,
        response: null,
      }
    }

  }
}
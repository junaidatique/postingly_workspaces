const faker = require('faker');
// const productStubs = require('../graqphql/__tests__/product/stubs');
const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const stringHelper = require('shared').stringHelper;
const moment = require('moment');
const _ = require('lodash');
const dbConnection = require('./db');
// const createUpdates = require('./createUpdates');
// const scheduleProductUpdates = require('./scheduleProductUpdates');
// const shareUpdates = require('./shareUpdates');
// const changeCaption = require('./changeCaption');
const fetch = require('node-fetch');


let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  // Create an SQS service object
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
const {
  PARTNERS_SHOPIFY,
  FACEBOOK_SERVICE,
  TWITTER_SERVICE,
  BUFFER_SERVICE,
  RULE_TYPE_OLD,
  POST_BETWEEN_WITH_INTERVAL,
  POST_AS_OPTION_FB_PHOTO,
  COLLECTION_OPTION_ALL,
  POSTING_SORTORDER_RANDOM,
  POSTING_SORT_ORDER_NEWEST,
  FACEBOOK_DEFAULT_TEXT,
  LINK_SHORTENER_SERVICES_POOOST,
  FACEBOOK_PROFILE,
  FACEBOOK_PAGE,
  FACEBOOK_GROUP,
  TWITTER_PROFILE,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_FACEBOOK_GROUP,
  BUFFER_TWITTER_PROFILE,
  BUFFER_LINKEDIN_PROFILE,
  BUFFER_LINKEDIN_PAGE,
  BUFFER_LINKEDIN_GROUP,
  BUFFER_INSTAGRAM_PROFILE,
  BUFFER_INSTAGRAM_BUSINESS,
  APPROVED,

} = require('shared/constants')
const IgApiClient = require('instagram-private-api').IgApiClient;
const get = require('request-promise').get;
var request = require('request-promise');

// import { IgApiClient } from 'instagram-private-api'
module.exports = {
  fakeSave: function (data) {
    // console.log("data", data)

  },
  testFetch: async function (event, context) {
    await dbConnection.createConnection(context);
    const profile = await shared.ProfileModel.findById('5f7c51e813aae60009f32fca');
    // const profile = await shared.ProfileModel.findOne()
    const iCookie = await shared.InstaCookie.find({ username: profile.serviceUsername })
    // console.log("profile", profile)


    const ig = new IgApiClient();
    ig.state.generateDevice(profile.serviceUsername);
    // // console.log("ig", ig)
    ig.state.proxyUrl = stringHelper.getProxyURL();
    // const igPK = 42386099189;
    const igPK = profile.serviceUserId;
    // // await ig.simulate.preLoginFlow();
    // // ig.request.end$.subscribe(async () => {
    // //   const serialized = await ig.state.serialize();
    // //   // console.log("serialized", serialized)
    // //   delete serialized.constants; // this deletes the version info, so you'll always use the version provided by the library
    // //   module.exports.fakeSave(serialized);
    // // });
    // // const loggedInUser = await ig.account.login(process.env.INSTAGRAM_TEST_USERNAME, process.env.INSTAGRAM_TEST_PASSWORD);
    // // console.log("loggedInUser", loggedInUser)

    // const data = {
    //   cookies: '{"version":"tough-cookie@2.4.3","storeType":"MemoryCookieStore","rejectPublicSuffixes":true,"cookies":[{"key":"csrftoken","value":"Cxu4klofJOoe4SfXhdbgEsgHKD0Nr7jg","expires":"2021-10-03T17:32:18.000Z","maxAge":31449600,"domain":"instagram.com","path":"/","secure":true,"hostOnly":false,"creation":"2020-10-04T17:32:01.891Z","lastAccessed":"2020-10-04T17:32:18.341Z"},{"key":"mid","value":"X3oHEQABAAEgHf1Fx_h1Ov4heFQw","expires":"2022-10-04T17:32:01.000Z","maxAge":63072000,"domain":"instagram.com","path":"/","secure":true,"hostOnly":false,"creation":"2020-10-04T17:32:01.894Z","lastAccessed":"2020-10-04T17:32:14.896Z"},{"key":"ds_user","value":"sunshinesocks3","expires":"2021-01-02T17:32:18.000Z","maxAge":7776000,"domain":"instagram.com","path":"/","secure":true,"httpOnly":true,"hostOnly":false,"creation":"2020-10-04T17:32:18.340Z","lastAccessed":"2020-10-04T17:32:18.340Z"},{"key":"rur","value":"FRC","domain":"instagram.com","path":"/","secure":true,"httpOnly":true,"hostOnly":false,"creation":"2020-10-04T17:32:18.342Z","lastAccessed":"2020-10-04T17:32:18.342Z"},{"key":"ds_user_id","value":"42386099189","expires":"2021-01-02T17:32:18.000Z","maxAge":7776000,"domain":"instagram.com","path":"/","secure":true,"hostOnly":false,"creation":"2020-10-04T17:32:18.344Z","lastAccessed":"2020-10-04T17:32:18.344Z"},{"key":"sessionid","value":"42386099189%3ArfqUeYKtSmeIaf%3A0","expires":"2021-10-04T17:32:18.000Z","maxAge":31536000,"domain":"instagram.com","path":"/","secure":true,"httpOnly":true,"hostOnly":false,"creation":"2020-10-04T17:32:18.345Z","lastAccessed":"2020-10-04T17:32:18.345Z"}]}',
    //   supportedCapabilities: [
    //     {
    //       name: 'SUPPORTED_SDK_VERSIONS',
    //       value: '13.0,14.0,15.0,16.0,17.0,18.0,19.0,20.0,21.0,22.0,23.0,24.0,25.0,26.0,27.0,28.0,29.0,30.0,31.0,32.0,33.0,34.0,35.0,36.0,37.0,38.0,39.0,40.0,41.0,42.0,43.0,44.0,45.0,46.0,47.0,48.0,49.0,50.0,51.0,52.0,53.0,54.0,55.0,56.0,57.0,58.0,59.0,60.0,61.0,62.0,63.0,64.0,65.0,66.0'
    //     },
    //     { name: 'FACE_TRACKER_VERSION', value: 12 },
    //     { name: 'segmentation', value: 'segmentation_enabled' },
    //     { name: 'COMPRESSION', value: 'ETC2_COMPRESSION' },
    //     { name: 'world_tracker', value: 'world_tracker_enabled' },
    //     { name: 'gyroscope', value: 'gyroscope_enabled' }
    //   ],
    //   language: 'en_US',
    //   timezoneOffset: '18000',
    //   radioType: 'wifi-none',
    //   capabilitiesHeader: '3brTvwE=',
    //   connectionTypeHeader: 'WIFI',
    //   isLayoutRTL: false,
    //   euDCEnabled: undefined,
    //   adsOptOut: false,
    //   thumbnailCacheBustingValue: 1000,
    //   clientSessionIdLifetime: 1200000,
    //   pigeonSessionIdLifetime: 1200000,
    //   deviceString: '26/8.0.0; 420dpi; 1080x2094; samsung; SM-A730F; jackpot2lte; samsungexynos7885',
    //   deviceId: 'android-5a157ec27f13bd99',
    //   uuid: '02ce9ee8-2096-5ff5-9af6-35beab4d670f',
    //   phoneId: '527b8c8f-25ea-552e-bcf7-711e1f4d43b9',
    //   adid: '524b9125-b6f1-5511-b7e3-118e1f15ceb2',
    //   build: 'JLS36I',
    //   igWWWClaim: 'hmac.AR1_GbBZRH20JFZoJ9nuccbIL4p_V6Hx4qSvGOl0SPwqpyoe',
    //   passwordEncryptionKeyId: '129',
    //   passwordEncryptionPubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFzd05jVDZNMXRvS1c1NDNVZkhzSwpoVWVqN2ZPdlZzSDhDVkY4MDJDbjBRMUlINTNGSUJtWGc5c09BMzVPK25GcnBmK2c2Y0M4bDdyMVgxdVFIa3NXCjRrTWNjaVRJZFU4QkZCbFJiUVdLUjdsQk9KWklTMFFFREc3NTlxRjRZampVZlNIOEkxMFN1ZFFFUHBKYlFaSUIKMkRtL0kwZ0Jpclp4VDFvK3VVcGh1Y1hkbzFzbE1Ia2NSRzBwM0ovRFJ5N25lYnBnb21Ycm0xUnF4TWFhZU4rQQpWb2lEek8vaGlNTnVLNW1TVVZJNkVYTFUrRWsvVTdPS0JGYWRwY2Vkd01NSG03cVRQeDFrZ0xRNzl2TUlQa1l0Cm53anZHRTBLV1FBMDQwdFkwUXBJaHJzZmsrR21sSVE2WjhyUWJFQWtWYit6NmNSdm53QnZFL0ltZ3hTMHREdE0KS1FJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='
    // }
    // console.log("data.cookies.cookies", JSON.parse(data.cookies).cookies)
    // await ig.state.deserialize(data);
    await ig.state.deserialize(iCookie[0].cookies);

    const userFeed = ig.feed.user(igPK);
    // console.log("userFeed", userFeed)
    const myPostsFirstPage = await userFeed.items();

    for (i = 0; i < 5; i++) {
      console.log("myPostsFirstPage[0].code", myPostsFirstPage[i].code)
      console.log("myPostsFirstPage[0].caption.text", myPostsFirstPage[i].caption.text)
      console.log("myPostsFirstPage[0].image_versions2", myPostsFirstPage[i].image_versions2)
      console.log("myPostsFirstPage[0].deleted_reason", myPostsFirstPage[i].deleted_reason)
      console.log("-------------------------------------------")
    }



    // // if (fakeExists()) {
    // //   // import state accepts both a string as well as an object
    // //   // the string should be a JSON object
    // //   await ig.state.deserialize(fakeLoad());
    // // }

    // // try {
    // //   const loggedInUser = await ig.account.login(process.env.INSTAGRAM_TEST_USERNAME, process.env.INSTAGRAM_TEST_PASSWORD);
    // //   console.log("auth", loggedInUser)
    // // } catch (error) {
    // //   console.log("error", error.message)
    // // }

    // // await ig.simulate.postLoginFlow();
    // // const userFeed = ig.feed.user(loggedInUser.pk);
    // // const myPostsFirstPage = await userFeed.items();
    // // // console.log("myPostsFirstPage", myPostsFirstPage[0])
    // // console.log("myPostsFirstPage", myPostsFirstPage[0].image_versions2.candidates)

    // // const imageURL = 'https://picsum.photos/800/800';
    // // const imageBuffer = await get({
    // //   url: imageURL,
    // //   encoding: null,
    // // });

    // // const publishResult = await ig.publish.photo({
    // //   file: imageBuffer,
    // //   caption: `Really nice photo from the internet! 💖 ${Math.random(0, 10)}`,
    // // });

    // // console.log(publishResult);



  },




}

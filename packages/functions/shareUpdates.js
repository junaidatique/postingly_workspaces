const shared = require('shared');
const _ = require('lodash');
const moment = require('moment')
const updateClass = require('shared').updateClass;
const sqsHelper = require('shared').sqsHelper;
const {
  FACEBOOK_SERVICE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO,
  TWITTER_SERVICE, TWITTER_PROFILE, BUFFER_SERVICE, POSTED, COLLECTION_OPTION_ALL, FAILED, APPROVED,
  PARTNERS_SHOPIFY
} = require('shared/constants');
const FacebookService = require('shared').FacebookService;
const TwitterService = require('shared').TwitterService;
const BufferService = require('shared').BufferService;
const PartnerShopify = require('shared').PartnerShopify;
const scheduleClass = require('shared').scheduleClass;
const dbConnection = require('./db');
module.exports = {
  share: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: schedule event", event)
    if (event.source === 'serverless-plugin-warmup') {
      console.log('WarmUP - Lambda is warm!')
      await new Promise(r => setTimeout(r, 25));
      return 'lambda is warm!';
    }

    // function starts here. 
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const RuleModel = shared.RuleModel;
    const update = await UpdateModel.findById(event.updateId);

    // console.log("update.scheduleState", update.scheduleState);
    if (_.isNull(update) || _.isUndefined(update) || update.scheduleState !== APPROVED) {
      return;
    }
    console.log("update.postingCollectionOption", update.postingCollectionOption)
    if (_.isNull(update.postingCollectionOption) || update.postingCollectionOption === null) {
      update.postingCollectionOption = COLLECTION_OPTION_ALL;
      update.scheduleState = FAILED;
      update.failedMessage = "Duplicate Post";
      console.log("TCL: update 1 postingCollectionOption", update._id);
      await update.save();
      return;
    }
    let response;
    console.log("TCL: process.env.ENABLE_POSTING", process.env.ENABLE_POSTING)
    if (process.env.ENABLE_POSTING === 'true') {
      console.log("update.service", update.service)
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
      } else if (update.service === TWITTER_SERVICE) {
        if (update.serviceProfile === TWITTER_PROFILE) {
          response = await TwitterService.shareTwitterPosts(update);
        }
      } else if (update.service === BUFFER_SERVICE) {
        response = await BufferService.shareProductPosts(update);
      }
      console.log("TCL: response", response)
    } else {
      response = {
        scheduleState: POSTED,
        failedMessage: null,
        response: {}
      }
    }

    if (_.isNull(update.postingCollectionOption)) {
      update.postingCollectionOption = COLLECTION_OPTION_ALL;
    }

    if (!_.isUndefined(response)) {
      console.log("!_.isUndefined(response.failedMessage)", !_.isUndefined(response.failedMessage))
      console.log("response.scheduleState", response.scheduleState)
      console.log("response.failedMessage", response.failedMessage)
      if (response.scheduleState === FAILED && !_.isUndefined(response.failedMessage)) {
        if (response.failedMessage.indexOf('type unrecognized') >= 0 ||
          response.failedMessage.indexOf('Missing or invalid') >= 0 ||
          response.failedMessage.indexOf('provided image') >= 0
        ) {
          console.log("response.failedMessage", response.failedMessage)
          if (update.images[0].url.indexOf(PARTNERS_SHOPIFY) >= 0) {
            await PartnerShopify.getSingleProduct({ productId: update.product, storeId: update.store }, context)
            const scheduleResponse = await scheduleClass.reScheduleProduct(update.product, context)
            if (!_.isEmpty(scheduleResponse)) {
              return;
            }
            // query image again. 
            // reschedule the product if images are greater than the product
          }
        }
        if (response.failedMessage.indexOf('time in the future') >= 0) {
          update.scheduleTime = moment(update.scheduleTime).add(15, 'minutes');
          await update.save();
          return;
        }
        if (response.failedMessage.indexOf('Only owners of the URL') >= 0 && update.rule) {
          const updateRule = await RuleModel.findById(update.rule);
          if (updateRule) {
            updateRule.postAsOption = POST_AS_OPTION_FB_PHOTO;
            await updateRule.save();
            await updateClass.deleteScheduledUpdates(update.rule);
            await sqsHelper.addToQueue('CreateUpdates', { ruleId: update.rule, ruleIdForScheduler: update.rule });
          }
        }

      }

      update.scheduleState = response.scheduleState;
      if (response.failedMessage) {
        update.failedMessage = response.failedMessage;
      } else {
        if (response.scheduleState === FAILED) {
          update.failedMessage = "Something went wrong.";
        }
      }
      update.response = response.response;
      update.postingTime = moment().toISOString();
    } else {
      update.scheduleState = FAILED;
      update.failedMessage = "undefined.";
    }
    console.log("update.scheduleState", update.scheduleState)
    await update.save();
  },

}
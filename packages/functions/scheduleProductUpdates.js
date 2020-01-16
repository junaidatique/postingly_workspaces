const shared = require('shared');
const moment = require('moment');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const {
  NOT_SCHEDULED,
  PENDING,
  SCHEDULE_TYPE_PRODUCT,
  SCHEDULE_TYPE_VARIANT,
  POST_AS_OPTION_FB_ALBUM,
  POST_AS_OPTION_TW_ALBUM,
  POST_AS_OPTION_FB_PHOTO,
  POST_AS_OPTION_TW_PHOTO,
  COLLECTION_OPTION_ALL,
  COLLECTION_OPTION_SELECTED,
} = require('shared/constants');
const dbConnection = require('./db');
const schedulerHelper = require('./helpers/productScheduleFns')
module.exports = {
  // event = { ruleId: ID }
  schedule: async function (eventSQS, context) {
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    console.log("TCL: totalTime", totalTime)
    await dbConnection.createConnection(context);
    console.log('schedule after db connection =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
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
    // load models
    const RuleModel = shared.RuleModel;
    const StoreModel = shared.StoreModel;
    const UpdateModel = shared.UpdateModel;
    const ProductModel = shared.ProductModel;

    // get rule and store
    const ruleDetail = await RuleModel.findById(event.ruleId);
    console.log('schedule after ruleDetail =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
    console.log("TCL: ruleDetail.store", ruleDetail.store)
    if (ruleDetail === null) {
      console.log(`rule not found for ${event.ruleId}`);
      return;
    }
    const storeDetail = await StoreModel.findById(ruleDetail.store);
    const defaultShortLinkService = storeDetail.shortLinkService;

    // define vars    
    let imageLimit;
    let itemImages;
    let imagesForUpdate;
    let imagesForPosting;
    let updateData;
    let titleForCaption;
    let priceForCaption;
    let descriptionForCaption;
    let productCollections;
    let URLForCaption;
    let allowedCollections = [];
    const maxNumberOfDays = 7;
    // set limit for product images that if selected as fb alubm or twitter album than select first 4 images. 
    if (ruleDetail.postAsOption === POST_AS_OPTION_FB_ALBUM || ruleDetail.postAsOption === POST_AS_OPTION_TW_ALBUM) {
      imageLimit = 4;
    } else {
      imageLimit = 1;
    }
    // all updates are pushed into this array for update. 
    let bulkUpdate = [];
    let bulkProductUpdate = [];
    let existingScheduleItems = [];
    let updates = [];
    let dbImages = [];
    let productLimit = 8;

    // this will help in the query to max number of products. 
    let postingCollectionOption = COLLECTION_OPTION_ALL;
    if (!_.isUndefined(event.postingCollectionOption)) {
      postingCollectionOption = event.postingCollectionOption;
    }
    // if postingCollectionOption is from all collection get all the updates that are 
    // supposted to shared from all collections. 
    if (postingCollectionOption === COLLECTION_OPTION_ALL) {
      updates = await UpdateModel.find(
        {
          rule: ruleDetail._id,
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc(), $lt: moment().add(maxNumberOfDays, 'days').utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          postingCollectionOption: COLLECTION_OPTION_ALL
        }
      ).sort({ scheduleTime: 1 }).limit(productLimit);
    } else {
      // get posting timeing id and select updates one by one. 
      const postTimingIds = await UpdateModel.distinct('postTimingId',
        {
          rule: ruleDetail._id,
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(maxNumberOfDays, 'days') },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          postingCollectionOption: COLLECTION_OPTION_SELECTED
        }
      );
      if (postTimingIds.length > 0) {
        const unScheduledPostTimingId = postTimingIds[0];
        updates = await UpdateModel.find(
          {
            rule: ruleDetail._id,
            scheduleState: NOT_SCHEDULED,
            scheduleTime: { $gt: moment.utc(), $lt: moment().add(maxNumberOfDays, 'days').utc() },
            scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
            postTimingId: unScheduledPostTimingId
          }
        ).sort({ scheduleTime: 1 }).limit(productLimit);
        allowedCollections = updates[0].allowedCollections;
      }
    }
    console.log('schedule after updates =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
    // if no updates are found
    if (updates.length === 0) {
      // if postingCollectionOption is from all collection now check for selected collection.
      if (postingCollectionOption === COLLECTION_OPTION_ALL) {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: event.ruleId, postingCollectionOption: COLLECTION_OPTION_SELECTED });
      }
      return;
    }
    // profile for this rule. 
    const profile = ruleDetail.profile;
    // get all the sceduled products that are shared in one last day and 
    // for next 7 days. 
    const scheduledUpdates = await UpdateModel.find(
      {
        profile: profile,
        scheduleState: { $ne: NOT_SCHEDULED },
        scheduleTime: { $gt: moment().add(-1, 'days').utc(), $lt: moment().add(maxNumberOfDays, 'days').utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
      }
    ).sort({ scheduleTime: 1 }).select('_id product variant');
    console.log('schedule after scheduledUpdates =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));

    existingScheduleItems = scheduledUpdates.map(update => update.product);
    const productsToSchedule = await schedulerHelper.getProductsForSchedule(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, context);
    console.log('schedule after productsToSchedule =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));

    // loop on all the profiles of the rule
    await Promise.all(productsToSchedule.map(async (product, productIndex) => {
      console.log(`after ${productIndex} product =>`, (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
      console.log("TCL: item ID", product._id);
      scheduleUpdate = updates[productIndex];
      // if no update is found, this means all updates are scheduled and return. 
      if (_.isUndefined(scheduleUpdate)) {
        return;
      }
      // if no image is found for the variant than pick the image from product. 
      console.log("TCL: product.images.length", product.images.length)
      console.log("TCL: product.imagesList.length", product.imagesList.length)
      if (product.images.length === 0 && product.imagesList.length === 0) {
        return;
      }
      // this option is just give backup compatiblity for the old db structure. To be removed in future. 
      if (product.imagesList.length > 0) {
        imagesForUpdate = product.imagesList;
      } else {
        imagesForUpdate = product.images;
      }
      // console.log("TCL: imagesForUpdate", imagesForUpdate)
      // to update the products after all the updates.
      const productUpdateObject = {
        id: product._id,
        shareHistory: product.shareHistory,
        imagesList: imagesForUpdate,
        variants: product.variants
      }



      if (ruleDetail.postAsVariants) {

      } else {
        itemImages = _.orderBy(imagesForUpdate, ['position'], ['asc']);
        titleForCaption = product.title;
        priceForCaption = product.minimumPrice;
      }
      // console.log("TCL: itemImages-1", itemImages)
      descriptionForCaption = product.description;
      productCollections = product.collections;
      productExternalURL = product.partnerSpecificUrl;
      URLForCaption = product.url.map(productUrls => {
        if (defaultShortLinkService === productUrls.service) {
          return productUrls.url;
        }
      }).filter(item => !_.isUndefined(item));

      // First calculate images. 
      // for single image rotation is possible.
      // for multiple images just post first 4 images.
      if (imageLimit === 4) {
        imagesForPosting = itemImages.slice(0, imageLimit).map(postingImage => {
          return {
            url: postingImage.partnerSpecificUrl,
            thumbnailUrl: postingImage.thumbnailUrl,
            imageId: postingImage._id,
            partnerId: postingImage.partnerId
          }
        });
      } else {
        // if image limit is only one means only one image will be posted. 
        // if rotation of image is enabled. 
        if (ruleDetail.rotateImages && (ruleDetail.postAsOption === POST_AS_OPTION_FB_PHOTO || ruleDetail.postAsOption === POST_AS_OPTION_TW_PHOTO)) {
          if (ruleDetail.rotateImageLimit > 0) {
            // if rotateimageLimit is 1 it means rotate all images
            // otherwise rotate given number of images
            if (ruleDetail.rotateImageLimit !== 1) {
              itemImages = itemImages.slice(0, ruleDetail.rotateImageLimit);
            }
          }
          // console.log("TCL: itemImages0", itemImages)

          // get image histories. 
          // if no history is found than create an empty object. 
          itemImages = itemImages.map(image => {
            // console.log("TCL: itemImages image", image)
            // check if the image has history for this profile.
            let imageHistoryResponse = [];
            if (!_.isUndefined(image.shareHistory)) {
              imageHistoryResponse = image.shareHistory.map(history => {
                // console.log("TCL: history", history)
                if (history.profile.toString() == profile.toString()) {
                  return {
                    'imageId': image._id,
                    'partnerSpecificUrl': image.partnerSpecificUrl,
                    'thumbnailUrl': image.thumbnailUrl,
                    'partnerId': image.partnerId,
                    'position': image.position,
                    'historyId': history._id,
                    'counter': history.counter,
                  };
                }
              }).filter(item => !_.isUndefined(item));
            }
            // if no history is found. 
            if (_.isEmpty(imageHistoryResponse)) {
              return {
                'imageId': image._id,
                'partnerSpecificUrl': image.partnerSpecificUrl,
                'thumbnailUrl': image.thumbnailUrl,
                'partnerId': image.partnerId,
                'position': image.position,
                'historyId': null,
                'counter': 0,
              };
            } else {
              return imageHistoryResponse[0];
            }
          });

          // console.log("TCL: itemImages1", itemImages)
          itemImages = _.orderBy(itemImages, ['counter', 'position'], ['asc', 'asc']);
          // console.log("TCL: itemImages2", itemImages)
          const postingImage = itemImages[0];
          imagesForPosting = [
            {
              url: postingImage.partnerSpecificUrl,
              thumbnailUrl: postingImage.thumbnailUrl,
              imageId: postingImage.imageId,
              partnerId: postingImage.partnerId
            }
          ];
          // console.log("TCL: postingImage", postingImage)
          productUpdateObject.imagesList = productUpdateObject.imagesList.map(image => {
            // console.log("TCL: imagesList image", image)
            if (postingImage.imageId.toString() === image._id.toString()) {
              let imageShareHistory = image.shareHistory.map(history => {
                if (history.profile.toString() == profile.toString()) {
                  return history;
                } else {
                  return undefined;
                }
              }).filter(item => !_.isUndefined(item));
              if (_.isEmpty(imageShareHistory) || _.isUndefined(imageShareHistory)) {
                image.shareHistory[image.shareHistory.length] = { profile: profile, counter: 1 };
              } else {
                image.shareHistory = image.shareHistory.map(history => {
                  if (history.profile.toString() === profile.toString()) {
                    history.counter = history.counter + 1;
                  }
                  return history;
                });
              }

            }
            return image;
          })
        } else {
          postingImage = itemImages[0];
          imagesForPosting = [
            {
              url: postingImage.partnerSpecificUrl,
              thumbnailUrl: postingImage.thumbnailUrl,
              imageId: postingImage._id,
              partnerId: postingImage.partnerId
            }
          ];
        }

      }
      updateData = {};
      if (ruleDetail.postAsVariants) {
        // updateData[SCHEDULE_TYPE_VARIANT] = product._id;
      }
      updateData[SCHEDULE_TYPE_PRODUCT] = product._id;
      updateData.images = imagesForPosting;
      updateData.scheduleState = PENDING;
      updateData.titleForCaption = titleForCaption;
      updateData.priceForCaption = priceForCaption;
      updateData.descriptionForCaption = descriptionForCaption;
      updateData.productExternalURL = productExternalURL;
      if (!_.isEmpty(URLForCaption)) {
        updateData.URLForCaption = URLForCaption[0];
      }
      updateData.productCollections = productCollections;
      updateData.defaultShortLinkService = defaultShortLinkService;
      // console.log("TCL: updateData", updateData)
      bulkUpdate.push({
        updateOne: {
          filter: { uniqKey: scheduleUpdate.uniqKey },
          update: updateData,
          upsert: true
        }
      });


      // profile history for given profile in the item share history
      profileHistory = productUpdateObject.shareHistory.map(history => {
        if (history.profile.toString() === profile.toString()) {
          return history
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item))[0];
      // if no share history is found counter is set to one. 
      if (_.isEmpty(profileHistory) || _.isUndefined(profileHistory)) {
        productUpdateObject.shareHistory[productUpdateObject.shareHistory.length] = { profile: profile, counter: 1 };
      } else {
        // otherwise counter is incremented and history is returned. 
        productUpdateObject.shareHistory = productUpdateObject.shareHistory.map(history => {
          if (history.profile.toString() === profile.toString()) {
            history.counter = history.counter + 1;
          }
          return history;
        });
      }
      // now update the main array to reflect the changes. 
      bulkProductUpdate.push(productUpdateObject);

    }));
    console.log("TCL: bulkUpdate.length", bulkUpdate.length)
    // console.log("TCL: bulkUpdate", bulkUpdate.map(update => update.updateOne.filter))
    // console.log("TCL: bulkUpdate", bulkUpdate.map(update => update.updateOne.update))
    if (!_.isEmpty(bulkUpdate)) {
      const updatedUpdates = await UpdateModel.bulkWrite(bulkUpdate);
    }

    const productUpdate = bulkProductUpdate.map(productObject => {
      return {
        updateOne: {
          filter: { _id: productObject.id },
          update: {
            shareHistory: productObject.shareHistory,
            imagesList: productObject.imagesList,
            // variants: productObject.variants
          }
        }
      }
    })
    // console.log("TCL: productUpdate", productUpdate)
    // console.log("TCL: productUpdate", productUpdate.map(product => product.updateOne.filter))
    // console.log("TCL: productUpdate", productUpdate.map(product => product.updateOne.update.imagesList))
    if (!_.isEmpty(productUpdate)) {
      const productUpdates = await ProductModel.bulkWrite(productUpdate);
    }
    // console.log("TCL: bulkUpdate.length", bulkUpdate.length)
    if (bulkUpdate.length > 0) {
      await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: event.ruleId, postingCollectionOption: postingCollectionOption });
    }
  },
}


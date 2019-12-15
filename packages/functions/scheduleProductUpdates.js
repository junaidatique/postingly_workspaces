const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const {
  NOT_SCHEDULED,
  PENDING,
  SCHEDULE_TYPE_PRODUCT,
  SCHEDULE_TYPE_VARIANT,

  POST_AS_OPTION_FB_ALBUM,
  POST_AS_OPTION_TW_ALBUM,
  POST_AS_OPTION_FB_PHOTO,
  POST_AS_OPTION_TW_PHOTO
} = require('shared/constants');
const dbConnection = require('./db');
const schedulerHelper = require('./helpers/productScheduleFns')
module.exports = {
  // event = { ruleId: ID }
  schedule: async function (eventSQS, context) {
    let event;
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: schedule event", event)
    console.log('schedule event start', (context.getRemainingTimeInMillis() / 1000));
    await dbConnection.createConnection(context);
    console.log('schedule after db connection =>', (context.getRemainingTimeInMillis() / 1000));
    // load models
    const RuleModel = shared.RuleModel;
    const UpdateModel = shared.UpdateModel;
    const ProductModel = shared.ProductModel;
    const VariantModel = shared.VariantModel;
    const ImageModel = shared.ImageModel;
    const StoreModel = shared.StoreModel;

    // define vars
    let postItems, itemModel, itemType, counter = 0, count = 0, update, imageLimit, itemImages, imagesForPosting, updateData;
    // get rule and store
    const ruleDetail = await RuleModel.findById(event.ruleId);
    console.log('schedule ruledetail =>', (context.getRemainingTimeInMillis() / 1000));
    // console.log("TCL: ruleDetail", ruleDetail)
    if (ruleDetail === null) {
      console.log(`rule not found for ${event.ruleId}`)
    }
    const StoreDetail = await StoreModel.findById(ruleDetail.store);
    console.log("TCL: StoreDetail", StoreDetail.title)
    console.log('schedule storedetail =>', (context.getRemainingTimeInMillis() / 1000));
    // set limit for product images that if selected as fb alubm or twitter album than select first 4 images. 
    if (ruleDetail.postAsOption === POST_AS_OPTION_FB_ALBUM || ruleDetail.postAsOption === POST_AS_OPTION_TW_ALBUM) {
      imageLimit = 4;
    } else {
      imageLimit = 1;
    }
    // all updates are pushed into this array for update. 
    let bulkUpdate = [];
    let bulkShareHistory = [];
    let existingScheduleItems = [];


    const updates = await UpdateModel.find(
      {
        rule: ruleDetail._id,
        scheduleState: NOT_SCHEDULED,
        scheduleTime: { $gt: moment.utc(), $lt: moment().add(3, 'days').utc() },
        // scheduleTime: { $gt: moment.utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
      }
    ).sort({ scheduleTime: 1 }).limit(4);
    console.log('schedule updates =>', (context.getRemainingTimeInMillis() / 1000));
    const scheduledUpdates = await UpdateModel.find(
      {
        profile: ruleDetail.profile,
        scheduleState: { $ne: NOT_SCHEDULED },
        scheduleTime: { $gt: moment().add(-1, 'days').utc(), $lt: moment().add(7, 'days').utc() },
        // scheduleTime: { $gt: moment.utc() },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
      }
    ).sort({ scheduleTime: 1 }).select('_id product variant');
    console.log('schedule scheduledUpdates =>', (context.getRemainingTimeInMillis() / 1000));
    if (ruleDetail.postAsVariants) {
      itemModel = VariantModel;
      itemType = SCHEDULE_TYPE_VARIANT;
      existingScheduleItems = scheduledUpdates.map(update => update.variant);
    } else {
      itemModel = ProductModel;
      itemType = SCHEDULE_TYPE_PRODUCT;
      existingScheduleItems = scheduledUpdates.map(update => update.product);
    }
    console.log("TCL: scheduledUpdates", scheduledUpdates)
    console.log("TCL: existingScheduleItems", existingScheduleItems)
    // sreturn;




    // loop on all the profiles of the rule
    await Promise.all(updates.map(async (update, updateIndex) => {
      console.log("TCL: updateIndex", updateIndex)
      // get all the updaets of this rule that are not scheduled yet. 
      profile = update.profile;
      // get variants or products based on the rule settings. 
      if (ruleDetail.postAsVariants) {
        tempObject = await schedulerHelper.getVariantsForSchedule(update, profile, existingScheduleItems, updateIndex);
      } else {
        tempObject = await schedulerHelper.getProductsForSchedule(update, profile, existingScheduleItems, updateIndex, context);
      }
      console.log(`after ${updateIndex} product =>`, (context.getRemainingTimeInMillis() / 1000));
      if (_.isUndefined(tempObject.item)) {
        console.log("TCL: tempObject", tempObject)
        return;
      }
      item = tempObject.item;

      counter = 0;
      console.log("TCL: item ID", item._id)
      // if no image is found for the variant than pick the image from product. 
      if (itemType === SCHEDULE_TYPE_VARIANT && item.images.length === 0) {
        productImages = await ImageModel.find({ product: item.product });
        itemImages = _.orderBy(productImages, ['position'], ['asc']);
      } else {
        itemImages = _.orderBy(item.images, ['position'], ['asc']);
      }
      // if no image is found don't schedule and return. 
      console.log("TCL: itemImages.length", itemImages.length)
      if (itemImages.length === 0) {
        return;
      }
      // if image is one than record the rotaion.
      if (imageLimit == 1) {
        // if rotation is enabled and post as single image. 
        if (ruleDetail.rotateImages && (ruleDetail.postAsOption === POST_AS_OPTION_FB_PHOTO || ruleDetail.postAsOption === POST_AS_OPTION_TW_PHOTO)) {
          if (ruleDetail.rotateImageLimit > 0) {
            // if rotateimageLimit is 1 it means rotate all images
            // otherwise rotate given number of images
            if (ruleDetail.rotateImageLimit !== 1) {
              itemImages = itemImages.slice(0, ruleDetail.rotateImageLimit);
            }
          }
          // images list
          // console.log("TCL: itemImages", itemImages)
          // get image histories. 
          // if no history is found than create an empty object. 
          itemImages = itemImages.map(image => {
            // check if the image has history for this profile. 
            const imageHistoryResponse = image.shareHistory.map(history => {
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

          count = 0;
          // if image has history for this profile than
          // console.log("TCL: itemImages2", itemImages)
          itemImages = _.orderBy(itemImages, ['counter', 'position'], ['asc', 'asc']);
          // console.log("TCL: itemImages3", itemImages)
          const postingImage = itemImages[0];
          // console.log("TCL: postingImage", postingImage)
          imagesForPosting = [{ url: postingImage.partnerSpecificUrl, thumbnailUrl: postingImage.thumbnailUrl, imageId: postingImage.imageId, partnerId: postingImage.partnerId }];
          const dbImage = await ImageModel.findById(postingImage.imageId);
          if (_.isNull(postingImage.historyId)) {
            dbImage.shareHistory = { profile: profile, counter: 1 };
            await dbImage.save();
          } else {
            const dbhistory = await dbImage.shareHistory.id(postingImage.historyId);
            r = await dbhistory.set({ counter: dbhistory.counter + 1 });
            await dbImage.save();
          }
        } else {
          imagesForPosting = [{ url: itemImages[0].partnerSpecificUrl, thumbnailUrl: itemImages[0].thumbnailUrl, imageId: itemImages[0]._id, partnerId: itemImages[0].partnerId }];
        }
      } else {
        imagesForPosting = itemImages.slice(0, imageLimit).map(image => {
          return { url: image.partnerSpecificUrl, thumbnailUrl: image.thumbnailUrl, imageId: image._id, partnerId: image.partnerId }
        });
      }
      updateData = {};
      if (itemType === SCHEDULE_TYPE_VARIANT) {
        updateData[SCHEDULE_TYPE_PRODUCT] = item.product;
      }
      updateData.images = imagesForPosting;
      // update = updates[counter];
      updateData[itemType] = item._id;
      updateData.scheduleState = PENDING;
      console.log("TCL: updateData", updateData)
      bulkUpdate.push({
        updateOne: {
          filter: { uniqKey: update.uniqKey },
          update: updateData,
          upsert: true
        }
      })
      counter++;

      // add current share counter to shared history into product or varaint
      // first check that if the item is already scanned in this loop
      // and present in bulkShareHistory
      shareHistoryForItem = bulkShareHistory.map(history => {
        if (history.id === item.id) {
          return history;
        }
      }).filter(item => !_.isUndefined(item))[0];
      // if not than initialize with share history
      if (_.isEmpty(shareHistoryForItem)) {
        shareHistoryForItem = { id: item.id, shareHistory: item.shareHistory };
        bulkShareHistory.push(shareHistoryForItem);
      }
      // profile history for given profile in the item share history
      profileHistory = shareHistoryForItem.shareHistory.map(history => {
        if (history.profile.toString() === profile.toString()) {
          return history
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item))[0];;
      // if no share history is found counter is set to one. 
      if (_.isEmpty(profileHistory) || _.isUndefined(profileHistory)) {
        shareHistoryForItem.shareHistory[shareHistoryForItem.shareHistory.length] = { profile: update.profile, counter: 1 };
      } else {
        // otherwise counter is incremented and history is returned. 
        shareHistoryForItem.shareHistory = shareHistoryForItem.shareHistory.map(history => {
          if (history.profile.toString() === profile.toString()) {
            history.counter = history.counter + 1;
          }
          return history;
        });
      }
      // now update the main array to reflect the changes. 
      bulkShareHistory = bulkShareHistory.map(history => {
        if (history.id === shareHistoryForItem.id) {
          history.shareHistory = shareHistoryForItem.shareHistory;
        }
        return history;
      })
    }));
    console.log("TCL: bulkUpdate", bulkUpdate.map(update => update.updateOne.filter))
    console.log("TCL: bulkUpdate", bulkUpdate.map(update => update.updateOne.update))
    if (!_.isEmpty(bulkUpdate)) {
      const updatedUpdates = await UpdateModel.bulkWrite(bulkUpdate);
    }
    const productUpdate = bulkShareHistory.map(history => {
      return {
        updateOne: {
          filter: { _id: history.id },
          update: {
            shareHistory: history.shareHistory
          }
        }
      }
    })
    if (!_.isEmpty(productUpdate)) {
      const productUpdates = await ProductModel.bulkWrite(productUpdate);
      // console.log("TCL: productUpdates", productUpdates)
    }
    // console.log("TCL: bulkShareHistory final", bulkShareHistory)

  },


}


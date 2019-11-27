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
    console.log("TCL: schedule eventSQS", eventSQS)
    if (_.isUndefined(eventSQS.Records)) {
      event = eventSQS;
    } else {
      event = JSON.parse(eventSQS.Records[0].body);
    }
    console.log("TCL: schedule event", event)
    await dbConnection.createConnection(context);

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
    console.log("TCL: ruleDetail", ruleDetail)
    if (ruleDetail === null) {
      console.log(`rule not found for ${event.ruleId}`)
    }
    const StoreDetail = await StoreModel.findById(ruleDetail.store);
    // console.log("TCL: StoreDetail", StoreDetail)
    const defaultShortLinkService = StoreDetail.shortLinkService;
    // set limit for product images that if selected as fb alubm or twitter album than select first 4 images. 
    if (ruleDetail.postAsOption === POST_AS_OPTION_FB_ALBUM || ruleDetail.postAsOption === POST_AS_OPTION_TW_ALBUM) {
      imageLimit = 4;
    } else {
      imageLimit = 1;
    }
    // all updates are pushed into this array for update. 
    let bulkUpdate = [];
    let bulkShareHistory = [];
    let bulkItemUpdate = [];
    if (ruleDetail.postAsVariants) {
      itemModel = VariantModel;
      itemType = SCHEDULE_TYPE_VARIANT;
    } else {
      itemModel = ProductModel;
      itemType = SCHEDULE_TYPE_PRODUCT;
    }
    // loop on all the profiles of the rule
    await Promise.all(ruleDetail.profiles.map(async profile => {
      // get all the updaets of this rule that are not scheduled yet. 
      const updates = await UpdateModel.find(
        {
          rule: ruleDetail._id,
          profile: profile,
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc(), $lt: moment().add(7, 'days').utc() },
          // scheduleTime: { $gt: moment.utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        }
      ).sort({ scheduleTime: 1 });
      // if there are any updates that are not scheduled yet. 
      console.log(`TCL: updates.length ${profile}`, updates.length)
      if (updates.length > 0) {
        // get variants or products based on the rule settings. 
        if (ruleDetail.postAsVariants) {
          postItems = await schedulerHelper.getVariantsForSchedule(ruleDetail, profile, updates.length);
        } else {
          postItems = await schedulerHelper.getProductsForSchedule(ruleDetail, profile, updates.length);
        }
        counter = 0;
        // console.log("TCL: postItems", postItems)
        console.log("TCL: postItems.length", postItems.length)
        await Promise.all(postItems.map(async item => {
          // if no image is found for the variant than pick the image from product. 
          if (item.images.length === 0 && itemType === SCHEDULE_TYPE_VARIANT) {
            productImages = await ImageModel.find({ product: item.product });
            itemImages = _.orderBy(productImages, ['position'], ['asc']);
          } else {
            itemImages = _.orderBy(item.images, ['position'], ['asc']);
          }
          // if no image is found don't schedule and return. 
          if (itemImages.length === 0) {
            return;
          }
          if (imageLimit == 1) {
            if (ruleDetail.rotateImages && (ruleDetail.postAsOption === POST_AS_OPTION_FB_PHOTO || ruleDetail.postAsOption === POST_AS_OPTION_TW_PHOTO)) {
              if (ruleDetail.rotateImageLimit > 0) {
                if (ruleDetail.rotateImageLimit === 1) {
                  itemImages = ruleDetail.rotateImageLimit;
                } else {
                  itemImages = itemImages.slice(0, ruleDetail.rotateImageLimit);
                }

              }
              const imageHistories = itemImages.map(image => {
                return image.shareHistory.map(history => {
                  if (history.profile.toString() == profile.toString()) {
                    return {
                      'imageId': image._id,
                      'url': image.partnerSpecificUrl,
                      'thumbnailUrl': image.thumbnailUrl,
                      'partnerId': image.partnerId,
                      'position': image.position,
                      'historyId': history._id,
                      'counter': history.counter,
                    };
                  }
                })
              })
              count = 0;
              itemImages = imageHistories.map(imageHistory => {
                if (_.isEmpty(imageHistory)) {
                  return {
                    'imageId': itemImages[count]._id,
                    'partnerSpecificUrl': itemImages[count].partnerSpecificUrl,
                    'thumbnailUrl': itemImages[count].thumbnailUrl,
                    'partnerId': itemImages[count].partnerId,
                    'position': itemImages[count++].position,
                    'historyId': null,
                    'counter': 0
                  };
                } else {
                  count++;
                  return imageHistory[0];
                }
              });
              itemImages = _.orderBy(itemImages, ['counter', 'position'], ['asc', 'asc']);
              const postingImage = itemImages[0];
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
            imagesForPosting = itemImages.slice(0, 4).map(image => {
              return { url: image.partnerSpecificUrl, thumbnailUrl: image.thumbnailUrl, imageId: image._id, partnerId: image.partnerId }
            });
          }
          updateData = {};
          if (itemType === SCHEDULE_TYPE_VARIANT) {
            updateData[SCHEDULE_TYPE_PRODUCT] = item.product;
          }
          updateData.images = imagesForPosting;
          update = updates[counter];
          updateData[itemType] = item._id;
          updateData.scheduleState = PENDING;
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
            console.log("TCL: profileHistory", profileHistory)
            console.log("TCL: shareHistoryForItem", shareHistoryForItem)
            console.log("TCL: shareHistoryForItem.shareHistory", shareHistoryForItem.shareHistory)
            shareHistoryForItem.shareHistory.push({ profile: update.profile, counter: 1 })
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
      }
    }));
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
      console.log("TCL: productUpdates", productUpdates)
    }
    // console.log("TCL: bulkShareHistory final", bulkShareHistory)

  },


}


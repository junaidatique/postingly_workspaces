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
  schedule: async function (event, context) {
    console.log("TCL: event", event)
    await dbConnection.createConnection(context);
    try {
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
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }
      const StoreDetail = await StoreModel.findById(ruleDetail.store);
      const defaultShortLinkService = StoreDetail.shortLinkService;
      // set limit for product images that if selected as fb alubm or twitter album than select first 4 images. 
      if (ruleDetail.postAsOption === POST_AS_OPTION_FB_ALBUM || ruleDetail.postAsOption === POST_AS_OPTION_TW_ALBUM) {
        imageLimit = 4;
      } else {
        imageLimit = 1;
      }
      let bulkUpdate = [];
      // loop on all the profiles of the rule
      await Promise.all(ruleDetail.profiles.map(async profile => {
        // get all the updaets of this rule that are not scheduled yet. 
        const updates = await UpdateModel.find(
          {
            rule: ruleDetail._id,
            profile: profile,
            scheduleState: NOT_SCHEDULED,
            scheduleTime: { $gt: moment.utc() },
            scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          }
        ).sort({ scheduleTime: 1 });
        // if there are any updates that are not scheduled yet. 
        if (updates.length > 0) {
          // get variants or products based on the rule settings. 
          if (ruleDetail.postAsVariants) {
            postItems = await schedulerHelper.getVariantsForSchedule(ruleDetail, profile, updates.length);
            itemModel = VariantModel;
            itemType = SCHEDULE_TYPE_VARIANT;
          } else {
            postItems = await schedulerHelper.getProductsForSchedule(ruleDetail, profile, updates.length);
            itemModel = ProductModel;
            itemType = SCHEDULE_TYPE_PRODUCT;
          }
          counter = 0;
          await Promise.all(postItems.map(async item => {
            if (item.images.length === 0 && itemType === SCHEDULE_TYPE_VARIANT) {
              productImages = await ImageModel.find({ product: item.product });
              itemImages = _.orderBy(productImages, ['position'], ['asc']);
            } else {
              itemImages = _.orderBy(item.images, ['position'], ['asc']);
            }
            if (imageLimit == 1) {
              if (ruleDetail.rotateImages && (ruleDetail.postAsOption === POST_AS_OPTION_FB_PHOTO || ruleDetail.postAsOption === POST_AS_OPTION_TW_PHOTO)) {
                if (ruleDetail.rotateImageLimit > 0) {
                  itemImages = itemImages.slice(0, ruleDetail.rotateImageLimit);
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

            profileHistory = await item.shareHistory.map(history => {
              if (history.profile.toString() == profile.toString()) {
                return history
              }
            });

            if (_.isEmpty(profileHistory) || _.isUndefined(profileHistory[0])) {
              item.shareHistory = { profile: update.profile, counter: 1 };
              await item.save();
            } else {
              r = await itemModel.updateOne({ _id: item._id, 'shareHistory.profile': profile },
                {
                  '$set': {
                    'shareHistory.$.counter': profileHistory[0].counter + 1
                  }
                });
            }
          }));
        }
      }));
      // console.log("TCL: bulkUpdate", bulkUpdate);
      if (!_.isEmpty(bulkUpdate)) {
        const updatedUpdates = await UpdateModel.bulkWrite(bulkUpdate);
      }
    } catch (error) {
      console.error(error.message);
    }
  },


}


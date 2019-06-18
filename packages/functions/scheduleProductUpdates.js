const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { NOT_SCHEDULED, PENDING, SCHEDULE_TYPE_PRODUCT, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED, RULE_TYPE_OLD, RULE_TYPE_NEW, POSTING_SORTORDER_NEWEST, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_TW_ALBUM, POST_AS_OPTION_FB_PHOTO, POST_AS_OPTION_TW_PHOTO } = require('shared/constants');


const ScheduleProductUpdates = {
  schedule: async function (event, context) {
    try {
      const RuleModel = shared.RuleModel;
      const UpdateModel = shared.UpdateModel;
      const ProductModel = shared.ProductModel;
      const VariantModel = shared.VariantModel;
      const ImageModel = shared.ImageModel;

      // define vars
      let postItems, itemModel, itemType, counter = 0, count = 0, updates, update, imageLimit, itemImages, imagesForPosting;
      // get rule and store
      const ruleDetail = await RuleModel.findById(event.ruleId);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }
      if (ruleDetail.postAsOption === POST_AS_OPTION_FB_ALBUM || ruleDetail.postAsOption === POST_AS_OPTION_TW_ALBUM) {
        imageLimit = 4;
      } else {
        imageLimit = 1;
      }

      await Promise.all(ruleDetail.profiles.map(async profile => {
        updates = await UpdateModel.find(
          {
            rule: ruleDetail._id,
            profile: profile,
            scheduleState: NOT_SCHEDULED,
            scheduleTime: { $gt: moment.utc() },
            scheduleType: SCHEDULE_TYPE_PRODUCT
          }
        ).sort({ scheduleTime: 1 });
        if (updates.length > 0) {
          if (ruleDetail.postAsVariants) {
            postItems = await ScheduleProductUpdates.getVariantsForSchedule(ruleDetail._id, profile, updates.length);
            itemModel = VariantModel;
            itemType = 'variant';
          } else {
            postItems = await ScheduleProductUpdates.getProductsForSchedule(ruleDetail._id, profile, updates.length);
            itemModel = ProductModel;
            itemType = 'product';
          }

          counter = 0;
          await Promise.all(postItems.map(async item => {
            itemImages = _.orderBy(item.images, ['position'], ['asc']);
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
                      'url': itemImages[count].partnerSpecificUrl,
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
                imagesForPosting = [{ url: postingImage.url }];
                const dbImage = await item.images.id(postingImage.imageId);
                if (_.isNull(postingImage.historyId)) {
                  r = await itemModel.updateOne({ _id: item._id, 'images._id': postingImage.imageId },
                    {
                      '$push': {
                        'images.$.shareHistory': { profile: profile, counter: 1 }
                      }
                    });

                } else {
                  const dbhistory = await dbImage.shareHistory.id(postingImage.historyId);
                  r = await dbhistory.set({ counter: dbhistory.counter + 1 });
                  await item.save();
                }
              } else {
                imagesForPosting = [{ url: itemImages[0].partnerSpecificUrl }];
              }
            } else {
              imagesForPosting = itemImages.slice(0, 4).map(image => {
                return { url: image.partnerSpecificUrl }
              });
            }

            update = updates[counter];

            update[itemType] = item._id;
            update.scheduleState = PENDING;
            update.images = imagesForPosting;
            counter++;
            await update.save();

            profileHistory = await item.shareHistory.map(history => {
              if (history.profile.toString() == profile.toString()) {
                return history
              }
            });

            if (_.isEmpty(profileHistory)) {
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
    } catch (error) {
      console.error(error.message);
    }
  },
  getProductsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const ProductModel = shared.ProductModel;

    let query;
    const ruleDetail = await RuleModel.findById(ruleId);
    query = ProductModel.find({ store: ruleDetail.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      query = query.sort({ partnerCreatedAt: desc })
    } else {
      query = query.limit(-1).skip(Math.random() * ProductModel.count())
    }
    query = query.limit(limit);
    const notSharedOnThisProfile = query.find({ "shareHistory.profile": { $ne: profileId } });

    let products = await notSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    lessSharedOnThisProfile = query.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 });
    products = await lessSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    return [];
  },
  getVariantsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const VariantModel = shared.VariantModel;

    let query;
    const ruleDetail = await RuleModel.findById(ruleId);
    query = VariantModel.find({ store: ruleDetail.store, active: true, postableByPrice: true, postableByImage: true });
    // if the rule is of type old than don't schedule new products
    if (ruleDetail.type == RULE_TYPE_OLD) {
      query = query.where({ postableIsNew: false })
    } else if (ruleDetail.type == RULE_TYPE_NEW) {
      query = query.where({ postableIsNew: true });
    }
    // if zero quantity is not allowed than only select in stock products 
    if (!ruleDetail.allowZeroQuantity) {
      query = query.where({ postableByQuantity: true })
    }
    if (ruleDetail.collectionOption === COLLECTION_OPTION_SELECTED) {
      query = query.where('collections').in(ruleDetail.collections);
    } else if (ruleDetail.collectionOption === COLLECTION_OPTION_NOT_SELECTED) {
      query = query.where('collections').nin(ruleDetail.collections);
    }
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      query = query.sort({ partnerCreatedAt: desc })
    } else {
      query = query.limit(-1).skip(Math.random() * VariantModel.count())
    }
    query = query.limit(limit);
    const notSharedOnThisProfile = query.find({ "shareHistory.profile": { $ne: profileId } });

    let products = await notSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    lessSharedOnThisProfile = query.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 });
    products = await lessSharedOnThisProfile;
    if (products.length > 0) {
      return products;
    }
    return [];
  }

}

module.exports = ScheduleProductUpdates;
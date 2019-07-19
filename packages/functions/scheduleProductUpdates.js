const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { NOT_SCHEDULED, PENDING, SCHEDULE_TYPE_PRODUCT, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED, RULE_TYPE_OLD, RULE_TYPE_NEW, POSTING_SORTORDER_NEWEST, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_TW_ALBUM, POST_AS_OPTION_FB_PHOTO, POST_AS_OPTION_TW_PHOTO } = require('shared/constants');


const ScheduleProductUpdates = {
  schedule: async function (event, context) {
    try {
      // load models
      const RuleModel = shared.RuleModel;
      const UpdateModel = shared.UpdateModel;
      const ProductModel = shared.ProductModel;
      const VariantModel = shared.VariantModel;
      const ImageModel = shared.ImageModel;

      // define vars
      let postItems, itemModel, itemType, counter = 0, count = 0, update, imageLimit, itemImages, imagesForPosting;
      // get rule and store
      const ruleDetail = await RuleModel.findById(event.ruleId);
      if (ruleDetail === null) {
        throw new Error(`rule not found for ${event.ruleId}`);
      }
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
            scheduleType: SCHEDULE_TYPE_PRODUCT
          }
        ).sort({ scheduleTime: 1 });
        // if there are any updates that are not scheduled yet. 
        if (updates.length > 0) {
          // get variants or products based on the rule settings. 
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
                        'thumbnailUrl': image.thumbnailUrl,
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
                      'thumbnailUrl': itemImages[count].thumbnailUrl,
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
                imagesForPosting = [{ url: itemImages[0].partnerSpecificUrl, thumbnailUrl: itemImages[0].thumbnailUrl }];
              }
            } else {
              imagesForPosting = itemImages.slice(0, 4).map(image => {
                return { url: image.partnerSpecificUrl, thumbnailUrl: image.thumbnailUrl }
              });
            }

            update = updates[counter];
            let updateData = {};
            updateData[itemType] = item._id;
            updateData.scheduleState = PENDING;
            updateData.images = imagesForPosting;
            bulkUpdate.push({
              updateOne: {
                filter: { uniqKey: update.uniqKey },
                update: updateData,
                upsert: true
              }
            })
            counter++;
            // update[itemType] = item._id;
            // update.scheduleState = PENDING;
            // update.images = imagesForPosting;
            // await update.save();

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
      const updatedUpdates = await UpdateModel.bulkWrite(bulkUpdate);

    } catch (error) {
      console.error(error.message);
    }
  },
  getProductsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const ProductModel = shared.ProductModel;
    const ruleDetail = await RuleModel.findById(ruleId);
    const notSharedOnThisProfileQuery = this.getProductsQuery(ruleDetail);
    const notSharedOnThisProfile = notSharedOnThisProfileQuery.find({ "shareHistory.profile": { $ne: profileId } });
    const productsForCount = await notSharedOnThisProfile;
    if (productsForCount.length > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(ruleDetail);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.random() * productsForCount.length)
      }
      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find({ "shareHistory.profile": { $ne: profileId } }).limit(limit);
      let products = await notSharedOnThisProfileLimitQuery.populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getProductsQuery(ruleDetail);
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 });
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const productCount = await ProductModel.find({ store: ruleDetail.store }).estimatedDocumentCount();
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * productCount)
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.limit(limit);
    let products = await lessSharedOnThisProfile.populate('images');
    return products;
  },
  getProductsQuery: function (ruleDetail) {
    const ProductModel = shared.ProductModel;
    let query;
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
    return query;
  },
  getVariantsForSchedule: async function (ruleId, profileId, limit) {
    const RuleModel = shared.RuleModel;
    const ruleDetail = await RuleModel.findById(ruleId);
    const notSharedOnThisProfile = this.getVariantsQuery(ruleDetail);
    const variantsCount = await notSharedOnThisProfile.find({ "shareHistory.profile": { $ne: profileId } }).estimatedDocumentCount();
    if (variantsCount > 0) {
      let query = this.getVariantsQuery(ruleDetail);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
        query = query.sort({ partnerCreatedAt: -1 })
      } else {
        const variantCount = await VariantModel.estimatedDocumentCount();
        query = query.limit(-1).skip(Math.random() * variantCount)
      }
      let products = await query.find({ "shareHistory.profile": { $ne: profileId } }).limit(limit).populate('images');
      return products;
    }
    let lessSharedOnThisProfile = this.getVariantsQuery(ruleDetail);;
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      const variantCount = await VariantModel.find({ store: ruleDetail.store }).estimatedDocumentCount();
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.random() * variantCount)
    }
    let products = await lessSharedOnThisProfile.find({ "shareHistory.profile": profileId }).sort({ "shareHistory.counter": 1 }).limit(limit).populate('images');
    return products;
  },
  getVariantsQuery: function (ruleDetail) {
    const VariantModel = shared.VariantModel;
    let query;
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
    return query;
  }

}

module.exports = ScheduleProductUpdates;
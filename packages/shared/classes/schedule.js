const shared = require('shared');
const moment = require('moment');
const sqsHelper = require('shared').sqsHelper;
const _ = require('lodash');
const ProductModel = shared.ProductModel;
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
  RULE_TYPE_OLD,
  RULE_TYPE_NEW,
  RULE_TYPE_MANUAL,
  POSTING_SORTORDER_NEWEST
} = require('shared/constants');

module.exports = {
  schedule: async function (event, context) {
    const totalTime = Math.ceil(context.getRemainingTimeInMillis() / 1000);
    if (context) {
      console.log('schedule after db connection =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
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


    // get rule and store
    const ruleDetail = await RuleModel.findById(event.ruleId);
    if (context) {
      console.log('schedule after ruleDetail =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
    }
    if (_.isNull(ruleDetail) || _.isUndefined(ruleDetail)) {
      console.log(`rule not found for ${event.ruleId}`);
      return;
    }

    console.log("TCL: ruleDetail.store", ruleDetail.store)
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
    let productsToSchedule = [];
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
    if (ruleDetail.type === RULE_TYPE_MANUAL) {
      updates = await UpdateModel.find(
        {
          rule: ruleDetail._id,
          scheduleState: NOT_SCHEDULED,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] }
        }
      ).sort({ scheduleTime: 1 }).limit(productLimit);
    } else {
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
    }
    if (context) {
      console.log('schedule after updates =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
    }
    console.log("TCL: -------------------------")
    console.log("TCL: updates.length", updates.length)
    console.log("TCL: -------------------------")
    // if no updates are found
    if (updates.length === 0) {
      // if postingCollectionOption is from all collection now check for selected collection.
      if (postingCollectionOption === COLLECTION_OPTION_ALL && ruleDetail.type !== RULE_TYPE_MANUAL) {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: event.ruleId, postingCollectionOption: COLLECTION_OPTION_SELECTED });
      }
      return;
    }
    // profile for this rule. 
    const profile = ruleDetail.profile;
    // get all the sceduled products that are shared in one last day and 
    // for next 7 days. 
    if (ruleDetail.type === RULE_TYPE_MANUAL) {
      productsToSchedule = await ProductModel.find({ _id: { $in: ruleDetail.selectedProducts } })
    } else {


      const scheduledUpdates = await UpdateModel.find(
        {
          profile: profile,
          scheduleState: { $ne: NOT_SCHEDULED },
          scheduleTime: { $gt: moment().add(-1, 'days').utc(), $lt: moment().add(maxNumberOfDays, 'days').utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        }
      ).sort({ scheduleTime: 1 }).select('_id product variant');
      if (context) {
        console.log('schedule after scheduledUpdates =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
      }

      existingScheduleItems = scheduledUpdates.map(update => update.product);
      productsToSchedule = await this.getProductsForSchedule(
        ruleDetail,
        existingScheduleItems,
        postingCollectionOption,
        allowedCollections,
        storeDetail.noOfActiveProducts
      );
    }
    if (context) {
      console.log('schedule after productsToSchedule =>', (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
    }
    console.log("TCL: -------------------------")
    console.log("TCL: productsToSchedule.length", productsToSchedule.length)
    console.log("TCL: -------------------------")

    // loop on all the profiles of the rule
    await Promise.all(productsToSchedule.map(async (product, productIndex) => {
      if (context) {
        console.log(`after ${productIndex} product =>`, (totalTime - (context.getRemainingTimeInMillis() / 1000)).toFixed(3));
      }
      console.log("TCL: item ID", product._id);
      scheduleUpdate = updates[productIndex];
      // if no update is found, this means all updates are scheduled and return. 
      if (_.isUndefined(scheduleUpdate)) {
        return;
      }
      // if no image is found for the variant than pick the image from product. 

      console.log("TCL: product.imagesList.length", product.imagesList.length)
      if (product.imagesList.length === 0) {
        return;
      }

      imagesForUpdate = product.imagesList;
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
        if ((ruleDetail.type === RULE_TYPE_MANUAL && history.rule && ruleDetail._id.toString() === history.rule.toString()) ||
          ((ruleDetail.type !== RULE_TYPE_MANUAL && history.profile.toString() === profile.toString()) && history.postType === ruleDetail.type)
        ) {
          return history;
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item))[0];
      // if no share history is found counter is set to one. 
      if (_.isEmpty(profileHistory) || _.isUndefined(profileHistory)) {
        productUpdateObject.shareHistory[productUpdateObject.shareHistory.length] = { profile: profile, counter: 1, postType: ruleDetail.type, rule: ruleDetail._id };
      } else {
        // otherwise counter is incremented and history is returned. 
        productUpdateObject.shareHistory = productUpdateObject.shareHistory.map(history => {
          if (history._id.toString() === profileHistory._id.toString()) {
            history.counter = history.counter + 1;
          }
          return history;
        });
      }
      // now update the main array to reflect the changes. 
      bulkProductUpdate.push(productUpdateObject);

    }));
    console.log("TCL: bulkUpdate.length", bulkUpdate.length)
    if (!_.isEmpty(bulkUpdate)) {
      try {
        const updatedUpdates = await UpdateModel.bulkWrite(bulkUpdate);
      } catch (error) {
        if (error.message.indexOf('E11000') >= 0) {
          await sqsHelper.addToQueue('ScheduleUpdates', event);
        }
      }
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
    if (!_.isEmpty(productUpdate)) {
      const productUpdates = await ProductModel.bulkWrite(productUpdate);
    }
    if (bulkUpdate.length > 0) {
      if (process.env.IS_OFFLINE === 'false') {
        await sqsHelper.addToQueue('ScheduleUpdates', { ruleId: event.ruleId, postingCollectionOption: postingCollectionOption });
      } else {
        this.schedule({ ruleId: event.ruleId, postingCollectionOption: postingCollectionOption }, context)
      }
    }
  },
  getProductsForSchedule: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts) {
    let products;
    products = await this.getNotSharedProducts(ruleDetail, [], postingCollectionOption, allowedCollections);
    if (products.length > 0) {
      return products;
    }
    if (ruleDetail.type === RULE_TYPE_NEW) {
      return products = [];
    }
    products = await this.getLessSharedProducts(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts);
    if (products.length === 0) {
      products = await this.getLessSharedProducts(ruleDetail, [], postingCollectionOption, allowedCollections, noOfActiveProducts);
    }

    return products;

  },



  // get all the products that are not shared on this profile. 
  getNotSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    console.log("TCL: getNotSharedProducts")
    const profileId = ruleDetail.profile;
    let notSharedOnThisProfileCountQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);

    notSharedOnThisProfileCountQuery = notSharedOnThisProfileCountQuery.countDocuments(
      {
        $or: [
          { "shareHistory.profile": { $ne: profileId } },
          {
            $and: [
              { "shareHistory.profile": profileId },
              { "shareHistory.postType": { $ne: ruleDetail.type } }
            ]
          },
          {
            $and: [
              { "shareHistory.profile": profileId },
              { "shareHistory.postType": ruleDetail.type },
              { "shareHistory.counter": 0 }
            ]
          }
        ]
      }
    );
    console.log("TCL: getNotSharedProducts notSharedOnThisProfileCountQuery['_conditions']", notSharedOnThisProfileCountQuery['_conditions']);
    const notSharedProductsForCount = await notSharedOnThisProfileCountQuery;
    console.log("TCL: getProductsForSchedule notSharedProductsForCount", notSharedProductsForCount)
    if (notSharedProductsForCount > 0) {
      let notSharedOnThisProfileLimitQuery = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
      if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.sort({ partnerCreatedAt: -1 })
      } else {
        notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(-1).skip(Math.floor(Math.random() * notSharedProductsForCount));
      }

      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.find(
        {
          $or: [
            { "shareHistory.profile": { $ne: profileId } },
            {
              $and: [
                { "shareHistory.profile": profileId },
                { "shareHistory.postType": { $ne: ruleDetail.type } }
              ]
            },
            {
              shareHistory: {
                profile: profileId,
                postType: ruleDetail.type,
                counter: 0
              }
            }
          ]
        }
      );

      notSharedOnThisProfileLimitQuery = notSharedOnThisProfileLimitQuery.limit(8);
      console.log("TCL: getNotSharedProducts notSharedOnThisProfileLimitQuery['_conditions']", notSharedOnThisProfileLimitQuery['_conditions']);
      console.log("TCL: getNotSharedProducts notSharedOnThisProfileLimitQuery['options']", notSharedOnThisProfileLimitQuery['options']);

      let products = await notSharedOnThisProfileLimitQuery;
      return products;
    } else {
      return [];
    }
  },

  getLessSharedProducts: async function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections, noOfActiveProducts) {
    console.log("TCL: lessSharedOnThisProfile")
    let lessSharedOnThisProfile = this.getProductsQuery(ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections);
    lessSharedOnThisProfile = lessSharedOnThisProfile.find({ "shareHistory.profile": ruleDetail.profile });
    if (ruleDetail.postingProductOrder == POSTING_SORTORDER_NEWEST || ruleDetail.type == RULE_TYPE_NEW) {
      lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ partnerCreatedAt: -1 })
    } else {
      lessSharedOnThisProfile = lessSharedOnThisProfile.limit(-1).skip(Math.floor(Math.random() * noOfActiveProducts));
    }
    lessSharedOnThisProfile = lessSharedOnThisProfile.sort({ "shareHistory.counter": 1 }).limit(8);
    console.log("TCL: getNotSharedProducts lessSharedOnThisProfile['_conditions']", lessSharedOnThisProfile['_conditions']);
    console.log("TCL: getNotSharedProducts lessSharedOnThisProfile['options']", lessSharedOnThisProfile['options']);
    let products = await lessSharedOnThisProfile;
    return products;
  },
  getProductsQuery: function (ruleDetail, existingScheduleItems, postingCollectionOption, allowedCollections) {
    let query;
    query = ProductModel.find(
      {
        store: ruleDetail.store,
        active: true,
        postableByPrice: true,
        postableByImage: true
      }
    );
    if (!_.isEmpty(existingScheduleItems)) {
      query = query.where({ _id: { $nin: existingScheduleItems } });
    }
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
    if (postingCollectionOption === COLLECTION_OPTION_SELECTED && allowedCollections.length > 0) {
      query = query.where('collections').in(allowedCollections);
    }
    if (ruleDetail.disallowedCollections.length > 0) {
      query = query.where('collections').nin(ruleDetail.disallowedCollections);
    }
    return query;
  }
}
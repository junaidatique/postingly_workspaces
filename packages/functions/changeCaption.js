const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const dbConnection = require('./db');
const {
  APPROVED,
  PENDING,
  SCHEDULE_TYPE_VARIANT,
  SCHEDULE_TYPE_PRODUCT,
  TWITTER_PROFILE,
  BUFFER_TWITTER_PROFILE,
  COLLECTION_OPTION_ALL
} = require('shared/constants');

module.exports = {
  update: async function (eventSQS, context) {
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

    await dbConnection.createConnection(context);

    const UpdateModel = shared.UpdateModel;
    const RuleModel = shared.RuleModel;
    const ProductModel = shared.ProductModel;
    const VariantModel = shared.VariantModel;
    const StoreModel = shared.StoreModel;
    const shortLink = shared.shortLink;
    const stringHelper = shared.stringHelper;
    let captionsForUpdate;
    let servicesQuery = UpdateModel.find(
      {
        scheduleState: PENDING,
        scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(3, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        URLForCaption: { $exists: true },
        autoApproveUpdates: true,
        autoAddCaptionOfUpdates: true,
        userEdited: false,
        captionsUpdated: false,
        rule: event.rule
      }
    );
    // console.log("TCL: event.storeId", event.storeId)
    // if (!_.isNull(event.storeId) && !_.isUndefined(event.storeId)) {
    //   servicesQuery = servicesQuery.where({ store: event.storeId });
    // }
    const updates = await servicesQuery.limit(50);
    // console.log("TCL: updates", updates)

    let approvedUpdates = [];
    const ruleDetail = await RuleModel.findById(event.rule);
    if (ruleDetail === null) {
      console.log(`rule not found for ${event.rule}`);
      return;
    }
    const ruleCaptions = ruleDetail.captions.map(caption => {
      return caption;
    });
    const StoreDetail = await StoreModel.findById(ruleDetail.store);
    const currencyFormat = stringHelper.stripTags(StoreDetail.moneyWithCurrencyFormat);
    const currency = currencyFormat.substr(currencyFormat.length - 3);
    // console.log("TCL: ruleCaptions", ruleCaptions)
    await Promise.all(updates.map(async update => {
      const updatedObject = {};
      if (update.autoAddCaptionOfUpdates) {
        const title = update.titleForCaption;
        const price = update.priceForCaption;
        let description;
        if (update.serviceProfile === TWITTER_PROFILE || update.serviceProfile === BUFFER_TWITTER_PROFILE) {
          description = '';
        } else {
          description = update.descriptionForCaption;
        }

        const url = update.URLForCaption;
        if (!_.isNull(url)) {
          captionsForUpdate = update.productCollections.map(productCategory => {
            return ruleCaptions.filter(caption => {
              if (caption.collections.includes(productCategory)) {
                return caption;
              }
            })
          })
          captionsForUpdate = captionsForUpdate[0];
          if (_.isEmpty(captionsForUpdate)) {
            captionsForUpdate = ruleCaptions.filter(caption => {
              if (caption.captionCollectionOption === COLLECTION_OPTION_ALL) {
                return caption;
              }
            });
          }
          const selectedCaption = captionsForUpdate[Math.floor((Math.random() * captionsForUpdate.length))];
          const selectedText = selectedCaption.captionTexts;
          updatedObject.text = stringHelper.formatCaptionText(selectedText, title, url, price, description, currency);
        }
      }
      if (update.autoApproveUpdates) {
        updatedObject.scheduleState = APPROVED;
      }
      if (!_.isEmpty(updatedObject)) {
        approvedUpdates.push(
          {
            updateOne: {
              filter: { uniqKey: update.uniqKey },
              update: updatedObject
            }
          }
        )
      }
    }));
    if (!_.isEmpty(approvedUpdates)) {
      const updateUpdates = await UpdateModel.bulkWrite(approvedUpdates);
    }
  }
}
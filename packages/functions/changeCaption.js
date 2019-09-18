const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const dbConnection = require('./db');
const { APPROVED, PENDING, SCHEDULE_TYPE_VARIANT, SCHEDULE_TYPE_PRODUCT } = require('shared/constants');

module.exports = {
  update: async function (event, context) {
    console.log("TCL: event", event)
    await dbConnection.createConnection(context);
    try {
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
          scheduleTime: { $gt: moment.utc() },
          scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
          rule: { $exists: true },
          autoApproveUpdates: true,
          autoAddCaptionOfUpdates: true,
          userEdited: false,
          service: event.service
        }
      );
      console.log("TCL: event.storeId", event.storeId)
      if (!_.isNull(event.storeId) && !_.isUndefined(event.storeId)) {
        servicesQuery = servicesQuery.where({ store: event.storeId });
      }
      const updates = await servicesQuery.limit(50);
      console.log("TCL: updates", updates)

      let approvedUpdates = [];
      await Promise.all(updates.map(async update => {
        const updatedObject = {};
        if (update.autoAddCaptionOfUpdates) {
          const ruleDetail = await RuleModel.findById(update.rule);
          let productId, variantDetail;
          if (ruleDetail.postAsVariants) {
            variantDetail = await VariantModel.findById(update[SCHEDULE_TYPE_VARIANT]);
            productId = variantDetail.product;
          } else {
            productId = update.product;
          }
          const productDetail = await ProductModel.findById(productId);
          const StoreDetail = await StoreModel.findById(update.store);
          let title, price;
          if (ruleDetail.postAsVariants) {
            title = variantDetail.title;
            price = variantDetail.price;
          } else {
            title = productDetail.title;
            price = productDetail.minimumPrice;
          }

          const description = productDetail.description;
          const defaultShortLinkService = StoreDetail.shortLinkService;
          const productDetailURL = await productDetail.url.map(urls => urls);
          const url = await shortLink.getItemShortLink(defaultShortLinkService, productDetail.partnerSpecificUrl, productDetailURL);
          if (!_.isNull(url)) {
            const ruleCaptions = ruleDetail.captions.map(caption => {
              return caption;
            });
            captionsForUpdate = productDetail.collections.map(productCategory => {
              return ruleCaptions.filter(caption => {
                if (caption.collections.includes(productCategory)) {
                  return caption;
                }
              })
            })
            captionsForUpdate = captionsForUpdate[0];
            if (_.isEmpty(captionsForUpdate)) {
              captionsForUpdate = ruleCaptions.filter(caption => {
                if (caption.isDefault) {
                  return caption;
                }
              });
            }
            const selectedCaption = captionsForUpdate[Math.floor((Math.random() * captionsForUpdate.length))];
            const selectedText = selectedCaption.captionTexts[Math.floor((Math.random() * selectedCaption.captionTexts.length))];
            updatedObject.text = stringHelper.formatCaptionText(selectedText, title, url, price, description);
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
    } catch (error) {
      console.error(error.message);
    }

  }
}
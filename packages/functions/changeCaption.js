const shared = require('shared');
const moment = require('moment');
const _ = require('lodash');
const { APPROVED, PENDING, COLLECTION_OPTION_SELECTED, LINK_SHORTNER_SERVICES_NONE, LINK_SHORTNER_SERVICES_POOOST, SCHEDULE_TYPE_PRODUCT } = require('shared/constants');

module.exports = {
  update: async function (event, context) {
    try {
      const UpdateModel = shared.UpdateModel;
      const RuleModel = shared.RuleModel;
      const ProductModel = shared.ProductModel;
      const StoreModel = shared.StoreModel;
      const shortLink = shared.shortLink;
      let captionsForUpdate;
      let servicesQuery = UpdateModel.find(
        {
          scheduleState: PENDING,
          scheduleTime: { $gt: moment.utc() },
          scheduleType: SCHEDULE_TYPE_PRODUCT,
          rule: { $exists: true },
          autoApproveUpdates: true,
          autoAddCaptionOfUpdates: true,
          userEdited: false,
          service: event.service
        }
      );
      if (!_.isNull(event.storeId)) {
        servicesQuery = servicesQuery.where({ store: event.storeId });
      }
      const updates = await servicesQuery.limit(50);

      let approvedUpdates = [];
      await Promise.all(updates.map(async update => {
        const updatedObject = {};
        if (update.autoAddCaptionOfUpdates) {
          const ruleDetail = await RuleModel.findById(update.rule);
          const productDetail = await ProductModel.findById(update.product);
          const StoreDetail = await StoreModel.findById(update.store);
          const title = productDetail.title;
          const price = productDetail.minimumPrice;
          const description = productDetail.description;
          let url = null;
          const defaultLinkSettings = StoreDetail.linkSettings.map(linkSetting => {
            if (linkSetting.isDefault) {
              return linkSetting;
            }
          })
          if (_.isEmpty(defaultLinkSettings) || defaultLinkSettings[0].service == LINK_SHORTNER_SERVICES_NONE) {
            url = productDetail.partnerSpecificUrl;
          } else {
            url = productDetail.url.map(link => {
              if (defaultLinkSettings[0].service == link.service) {
                return link.url;
              }
            })

            if (_.isEmpty(url)) {
              if (defaultLinkSettings[0].service === LINK_SHORTNER_SERVICES_POOOST) {
                url = await shortLink.pooostURL(productDetail.partnerSpecificUrl);
              }
            }
          }

          if (!_.isNull(url)) {
            const ruleCaptions = ruleDetail.captions.map(caption => {
              return caption;
            });
            captionsForUpdate = productDetail.collections.map(productCategory => {
              return ruleCaptions.filter(caption => {
                // console.log("TCL: caption.collections", caption.collections)
                // console.log("TCL: productCategory", productCategory)
                if (caption.collections.includes(productCategory)) {
                  return caption;
                }
              })
            })
            // console.log("TCL: captionsForUpdate start", captionsForUpdate);
            captionsForUpdate = captionsForUpdate[0];
            if (_.isEmpty(captionsForUpdate)) {
              captionsForUpdate = ruleCaptions.filter(caption => {
                if (caption.isDefault) {
                  return caption;
                }
              });
            }
            console.log("TCL: captionsForUpdate 2nd", captionsForUpdate);
            const selectedCaption = captionsForUpdate[Math.floor((Math.random() * captionsForUpdate.length))];
            const selectedText = selectedCaption.captionTexts[Math.floor((Math.random() * selectedCaption.captionTexts.length))];
            let formattedCaption = selectedText;
            formattedCaption = formattedCaption.replace('[product-title]', title);
            formattedCaption = formattedCaption.replace('[product-price]', price);
            formattedCaption = formattedCaption.replace('[product-url]', url);
            formattedCaption = formattedCaption.replace('[product-description]', description);
            updatedObject.text = formattedCaption;
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
      const updateUpdates = await UpdateModel.bulkWrite(approvedUpdates);
    } catch (error) {
      console.error(error.message);
    }

  }
}
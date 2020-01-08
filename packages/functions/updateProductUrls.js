const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const { SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, PENDING } = require('shared/constants');

const dbConnection = require('./db');

module.exports = {
  execute: async function (event, context) {
    await dbConnection.createConnection(context);
    const UpdateModel = shared.UpdateModel;
    const ProductModel = shared.ProductModel;
    const shortLink = shared.shortLink;
    const updates = await UpdateModel.find(
      {
        scheduleState: PENDING,
        scheduleTime: { $gt: moment.utc(), $lt: moment.utc().add(3, 'days') },
        scheduleType: { $in: [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT] },
        rule: { $exists: true },
        URLForCaption: { $exists: false },
        userEdited: false,
        captionsUpdated: false,
      }
    ).sort({ scheduleTime: 1 }).limit(50);
    console.log("TCL: updates.length", updates.length)
    const productsFromDB = await ProductModel.where('_id').in(updates.map(update => update.product));
    // console.log("TCL: productsFromDB", productsFromDB)
    let productUpdate = [];
    let bulkUpdate = [];
    let URLForCaption;
    let updatedURLs
    await Promise.all(updates.map(async update => {
      URLForCaption = await shortLink.getItemShortLink(update.defaultShortLinkService, update.productExternalURL, []);
      bulkUpdate.push({
        updateOne: {
          filter: { _id: update._id },
          update: {
            URLForCaption: URLForCaption
          }
        }
      });
      productURL = productsFromDB.map(product => {
        if (product._id === update.product) {
          return product.url;
        } else {
          return undefined;
        }
      }).filter(item => !_.isUndefined(item));
      productURL.push({ service: update.defaultShortLinkService, url: URLForCaption });
      productUpdate.push({
        updateOne: {
          filter: { _id: update.product },
          update: {
            url: productURL
          }
        }
      });
    }));
    console.log("TCL: bulkUpdate.length", bulkUpdate.length)
    if (!_.isEmpty(bulkUpdate)) {
      const updateUpdates = await UpdateModel.bulkWrite(bulkUpdate);
    }
    console.log("TCL: productUpdate.length", productUpdate.length)
    if (!_.isEmpty(productUpdate)) {
      const productUpdates = await ProductModel.bulkWrite(productUpdate);
    }

  },

}
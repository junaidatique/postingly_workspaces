
const mongoose = require('mongoose');
const storeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
  },
  url: {
    type: String
  },
  partner: {
    type: String,
    required: true,
    index: true
  },
  partnerId: {
    type: String
  },
  partnerPlan: {
    type: String
  },
  partnerSpecificUrl: {
    type: String
  },
  partnerCreatedAt: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  partnerUpdatedAt: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  partnerToken: {
    type: String
  },
  uniqKey: {
    type: String,
    required: true,
    unique: true
  },
  timezone: {
    type: String
  },
  moneyFormat: {
    type: String
  },
  moneyWithCurrencyFormat: {
    type: String
  },
  numberOfProducts: {
    type: Number
  },
  noOfActiveProducts: {
    type: Number
  },
  numberOfScheduledPosts: {
    type: Number
  },
  numberOfPosted: {
    type: Number
  },
  productsLastUpdated: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  isCharged: {
    type: Boolean
  },
  chargedMethod: {
    type: String
  },
  chargeId: {
    type: String
  },
  chargeDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  isUninstalled: {
    type: Boolean
  }
});

storeSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Store;
}

module.exports = mongoose.model(process.env.STORES_TABLE, storeSchema);





const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const { LINK_SHORTNER_SERVICES, PARTNERS } = require('shared/constants');

const LINK_SHORTNER = {
  service: {
    type: String,
    enum: LINK_SHORTNER_SERVICES
  },
  api_key: {
    type: String,
  }
}

const storeSchema = new mongoose.Schema({
  products: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    }
  ],
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection'
    }
  ],
  variants: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Variant'
    }
  ],
  profiles: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    }
  ],
  rules: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Rule'
    }
  ],
  updates: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Update'
    }
  ],
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String
  },
  partner: {
    type: String,
    required: true,
    index: true,
    enum: PARTNERS
  },
  partnerId: {
    type: String,
    required: true,
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
    type: String,
    required: true
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
  },
  linkSettings: [LINK_SHORTNER],
  uninstalledDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },

});

storeSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Store;
}

module.exports = mongoose.model('Store', storeSchema);




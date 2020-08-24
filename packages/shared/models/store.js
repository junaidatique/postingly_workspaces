
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');
const { LINK_SHORTENER_SERVICES, PARTNERS, PAYMENT_PLANS } = require('shared/constants');

const storeSchema = new mongoose.Schema({
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
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
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
    index: true,
  },
  partnerPlan: {
    type: String
  },
  paymentPlan: {
    type: String,
    enum: PAYMENT_PLANS
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
    type: Number,
    default: 0,
    index: true
  },
  numberOfConnectedProfiles: {
    type: Number,
    default: 0,
    index: true
  },
  noOfActiveProducts: {
    type: Number,
    default: 0
  },
  numberOfScheduledPosts: {
    type: Number,
    default: 0,
    index: true
  },
  numberOfPosted: {
    type: Number,
    default: 0,
    index: true
  },
  productsLastUpdated: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  cognitoUserCreate: {
    type: Boolean,
    default: false
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
  shortLinkService: {
    type: String,
    enum: LINK_SHORTENER_SERVICES
  },
  autoApproveUpdates: {
    type: Boolean,
    default: true,
  },
  autoAddCaptionOfUpdates: {
    type: Boolean,
    default: true,
  },
  isUninstalled: {
    type: Boolean,
    default: false,
    index: true
  },
  uninstalledDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  intercomId: {
    type: String
  },
  dBUpdated: {
    type: Boolean,
    default: false,
    index: true
  },
  activeCampaignId: {
    type: Number,
    index: true
  },
  noOfTrialDays: {
    type: Number,
    default: process.env.SHOPIFY_TRAIL_DAYS
  },
  active: {
    type: Boolean,
    default: true
  },
  showReviewMessage: {
    type: Boolean,
    default: false,
  },
  statusMessage: {
    type: String,
  },
  showStatusMessage: {
    type: Boolean,
    default: false
  },
  basicPackagePrice: {
    type: String,
    default: process.env.PLAN_AMOUNT_BASIC
  },
  proPackagePrice: {
    type: String,
    default: process.env.PLAN_AMOUNT_PRO
  },
  enableCustomPricing: {
    type: Boolean,
    default: false
  },
  lastSyncDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  disableSync: {
    type: Boolean,
    default: false
  },
  freeProActivated: {
    type: Boolean,
    default: false
  },
  postFullImageOnPostAsLink: {
    type: Boolean,
    default: false
  }

});

storeSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Store;
}
storeSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Store', storeSchema);


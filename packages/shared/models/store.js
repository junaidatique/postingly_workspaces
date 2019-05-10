const dynamoose = require('../helpers/dynamodb');

const Schema = dynamoose.Schema;

const storeSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  userId: {
    type: String,
  },
  partner: {
    type: String
  },
  partnerId: {
    type: String
  },
  partnerPlan: {
    type: String
  },
  title: {
    type: String,
  },
  storeUrl: {
    type: String
  },
  partnerSpecificUrl: {
    type: String
  },
  partnerCreatedAt: {
    type: String
  },
  partnerUpdatedAt: {
    type: String
  },
  partnerToken: {
    type: String
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
    type: String
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
    type: String
  },
  isUninstalled: {
    type: Boolean
  }
}, {
    throughput: {
      read: 5,
      write: 5
    },
    timestamps: true,
    errorUnknown: true
  });

module.exports = dynamoose.model(process.env.STORES_TABLE, storeSchema);

const faker = require('faker');
// const productStubs = require('../graqphql/__tests__/product/stubs');
const shared = require('shared');
const sqsHelper = require('shared').sqsHelper;
const moment = require('moment');
const _ = require('lodash');
const dbConnection = require('./db');
// const createUpdates = require('./createUpdates');
// const scheduleProductUpdates = require('./scheduleProductUpdates');
// const shareUpdates = require('./shareUpdates');
// const changeCaption = require('./changeCaption');
const fetch = require('node-fetch');
let lambda;
let sqs;
const AWS = require('aws-sdk');
if (process.env.IS_OFFLINE === 'false') {
  lambda = new AWS.Lambda({
    region: process.env.AWS_REGION //change to your region
  });
  // Create an SQS service object
  AWS.config.update({ region: process.env.AWS_REGION });
  sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
}
const {
  PARTNERS_SHOPIFY,
  FACEBOOK_SERVICE,
  TWITTER_SERVICE,
  BUFFER_SERVICE,
  RULE_TYPE_OLD,
  POST_BETWEEN_WITH_INTERVAL,
  POST_AS_OPTION_FB_PHOTO,
  COLLECTION_OPTION_ALL,
  POSTING_SORTORDER_RANDOM,
  POSTING_SORT_ORDER_NEWEST,
  FACEBOOK_DEFAULT_TEXT,
  LINK_SHORTENER_SERVICES_POOOST,
  FACEBOOK_PROFILE,
  FACEBOOK_PAGE,
  FACEBOOK_GROUP,
  TWITTER_PROFILE,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_FACEBOOK_GROUP,
  BUFFER_TWITTER_PROFILE,
  BUFFER_LINKEDIN_PROFILE,
  BUFFER_LINKEDIN_PAGE,
  BUFFER_LINKEDIN_GROUP,
  BUFFER_INSTAGRAM_PROFILE,
  BUFFER_INSTAGRAM_BUSINESS,
  APPROVED,

} = require('shared/constants')
module.exports = {

  testFetch: async function (event, context) {





  },




}

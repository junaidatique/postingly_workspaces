const mongoose = require('mongoose');
const Schema = mongoose.Schema;

exports.FACEBOOK_GRPAHAPI_URL = 'https://graph.facebook.com/v3.2/'
exports.DEV = 'dev'
exports.TEST = 'test'
exports.STAGING = 'staging'
exports.PROD = 'prod'

// schedule states
const NOT_SCHEDULED = 'not_scheduled'
const PENDING = 'pending'
const APPROVED = 'approved'
const POSTED = 'posted'
const FAILED = 'failed'
const PAUSED = 'paused'
exports.NOT_SCHEDULED = NOT_SCHEDULED
exports.PENDING = PENDING
exports.APPROVED = APPROVED
exports.POSTED = POSTED
exports.FAILED = FAILED
exports.PAUSED = PAUSED

// posting time options
const POST_IMMEDIATELY = 'postImmediately';
const POST_BETWEEN_WITH_INTERVAL = 'postBetweenWithInterval';
const CUSTOM_TIMINGS = 'customTimings'
exports.POST_IMMEDIATELY = POST_IMMEDIATELY;
exports.POST_BETWEEN_WITH_INTERVAL = POST_BETWEEN_WITH_INTERVAL;
exports.CUSTOM_TIMINGS = CUSTOM_TIMINGS;

// schedule types 
const SCHEDULE_TYPE_PRODUCT = 'product';
const SCHEDULE_TYPE_VARIANT = 'variant';
const SCHEDULE_TYPE_FEED = 'feed';
const SCHEDULE_TYPE_UPLOAD = 'upload';
const SCHEDULE_TYPE_LINK = 'link';
const SCHEDULE_TYPE_BLOG = 'blog';
exports.SCHEDULE_TYPE_PRODUCT = SCHEDULE_TYPE_PRODUCT;
exports.SCHEDULE_TYPE_VARIANT = SCHEDULE_TYPE_VARIANT;
exports.SCHEDULE_TYPE_FEED = SCHEDULE_TYPE_FEED;
exports.SCHEDULE_TYPE_UPLOAD = SCHEDULE_TYPE_UPLOAD;
exports.SCHEDULE_TYPE_LINK = SCHEDULE_TYPE_LINK;
exports.SCHEDULE_TYPE_BLOG = SCHEDULE_TYPE_BLOG;

// collection selection in rules
const COLLECTION_OPTION_ALL = 'selectProductsFromAll';
const COLLECTION_OPTION_SELECTED = 'selectProductsFromSelected';
const COLLECTION_OPTION_NOT_SELECTED = 'dontSelectProductsFromSelected';
exports.COLLECTION_OPTION_ALL = COLLECTION_OPTION_ALL;
exports.COLLECTION_OPTION_SELECTED = COLLECTION_OPTION_SELECTED;
exports.COLLECTION_OPTION_NOT_SELECTED = COLLECTION_OPTION_NOT_SELECTED;

// services
const FACEBOOK_SERVICE = 'Facebook';
const TWITTER_SERVICE = 'Twitter';
const INSTAGRAM_SERVICE = 'Instagram';
const LINKEDIN_SERVICE = 'Linkedin';
const PINTEREST_SERVICE = 'Pinterest';
const BUFFER_SERVICE = 'Buffer';
exports.FACEBOOK_SERVICE = FACEBOOK_SERVICE;
exports.TWITTER_SERVICE = TWITTER_SERVICE;
exports.INSTAGRAM_SERVICE = INSTAGRAM_SERVICE;
exports.LINKEDIN_SERVICE = LINKEDIN_SERVICE;
exports.PINTEREST_SERVICE = PINTEREST_SERVICE;
exports.BUFFER_SERVICE = BUFFER_SERVICE;

// service posting options
const POST_AS_OPTION_NONE = 'none'
const POST_AS_OPTION_FB_ALBUM = 'facebookPostAsAlbum'
const POST_AS_OPTION_FB_LINK = 'facebookPostAsLink'
const POST_AS_OPTION_FB_PHOTO = 'facebookPostAsPhoto'
const POST_AS_OPTION_TW_ALBUM = 'twitterPostAsMultiplePhoto'
const POST_AS_OPTION_TW_PHOTO = 'twitterPostAsSinglePhoto'
const POST_AS_OPTION_TW_LINK = 'twitterPostAsLink'
exports.POST_AS_OPTION_NONE = POST_AS_OPTION_NONE
exports.POST_AS_OPTION_FB_ALBUM = POST_AS_OPTION_FB_ALBUM
exports.POST_AS_OPTION_FB_LINK = POST_AS_OPTION_FB_LINK
exports.POST_AS_OPTION_FB_PHOTO = POST_AS_OPTION_FB_PHOTO
exports.POST_AS_OPTION_TW_ALBUM = POST_AS_OPTION_TW_ALBUM
exports.POST_AS_OPTION_TW_PHOTO = POST_AS_OPTION_TW_PHOTO
exports.POST_AS_OPTION_TW_LINK = POST_AS_OPTION_TW_LINK

// partners
const PARTNERS_SHOPIFY = 'shopify';
const PARTNERS_BIGCOMMERCE = 'bigcommerce';
exports.PARTNERS_SHOPIFY = PARTNERS_SHOPIFY;
exports.PARTNERS_BIGCOMMERCE = PARTNERS_BIGCOMMERCE;

// POSTING_SORTORDER
const POSTING_SORTORDER_NEWEST = 'newest';
const POSTING_SORTORDER_RANDOM = 'random';
exports.POSTING_SORTORDER_NEWEST = POSTING_SORTORDER_NEWEST;
exports.POSTING_SORTORDER_RANDOM = POSTING_SORTORDER_RANDOM;

// RULE_TYPE
const RULE_TYPE_OLD = 'old';
const RULE_TYPE_NEW = 'new';
const RULE_TYPE_SALE = 'sale';
exports.RULE_TYPE_OLD = RULE_TYPE_OLD;
exports.RULE_TYPE_NEW = RULE_TYPE_NEW;
exports.RULE_TYPE_SALE = RULE_TYPE_SALE;

// QUEUE_OPTIONS
const QUEUE_OPTIONS_PAUSE = 'pause';
const QUEUE_OPTIONS_REPLACE = 'replace';
exports.QUEUE_OPTIONS_PAUSE = QUEUE_OPTIONS_PAUSE;
exports.QUEUE_OPTIONS_REPLACE = QUEUE_OPTIONS_REPLACE;

//LINK_SHORTNER_SERVICES
const LINK_SHORTNER_SERVICES_NONE = 'none'
const LINK_SHORTNER_SERVICES_POOOST = 'Pooo.st'
const LINK_SHORTNER_SERVICES_BITLY = 'bit.ly'
exports.LINK_SHORTNER_SERVICES_NONE = LINK_SHORTNER_SERVICES_NONE;
exports.LINK_SHORTNER_SERVICES_POOOST = LINK_SHORTNER_SERVICES_POOOST;
exports.LINK_SHORTNER_SERVICES_BITLY = LINK_SHORTNER_SERVICES_BITLY;

exports.PARTNERS = [PARTNERS_SHOPIFY, PARTNERS_BIGCOMMERCE];
exports.SERVICES = [FACEBOOK_SERVICE, TWITTER_SERVICE, INSTAGRAM_SERVICE, LINKEDIN_SERVICE, PINTEREST_SERVICE, BUFFER_SERVICE];
exports.POSTING_TIME_OPTIONS = [POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS];
exports.POST_AS_OPTION = [POST_AS_OPTION_NONE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO, POST_AS_OPTION_TW_ALBUM, POST_AS_OPTION_TW_PHOTO, POST_AS_OPTION_TW_LINK];
exports.COLLECTION_OPTION = [COLLECTION_OPTION_ALL, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED];
exports.POSTING_SORTORDER = [POSTING_SORTORDER_NEWEST, POSTING_SORTORDER_RANDOM];
exports.SCHEDULE_STATE = [NOT_SCHEDULED, PENDING, APPROVED, POSTED, FAILED, PAUSED];
exports.RULE_TYPE = [RULE_TYPE_OLD, RULE_TYPE_NEW, RULE_TYPE_SALE];
exports.QUEUE_OPTIONS = [QUEUE_OPTIONS_PAUSE, QUEUE_OPTIONS_REPLACE];
exports.LINK_SHORTNER_SERVICES = [LINK_SHORTNER_SERVICES_NONE, LINK_SHORTNER_SERVICES_POOOST, LINK_SHORTNER_SERVICES_BITLY];
exports.SCHEDULE_TYPE = [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, SCHEDULE_TYPE_FEED, SCHEDULE_TYPE_UPLOAD, SCHEDULE_TYPE_LINK, SCHEDULE_TYPE_BLOG];

const SHARE_HISTORY = {
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  counter: Number
}

exports.IMAGE_SCHEMA = {
  partnerId: {
    type: String,
    required: true,
  },
  partnerSpecificUrl: {
    type: String
  },
  thumbnailUrl: {
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
  imgUniqKey: {
    type: String,
    required: true,
    unique: true
  },
  position: {
    type: Number,
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  shareHistory: [SHARE_HISTORY]
}

exports.FACEBOOK_DEFAULT_TEXT = '[product-title]' + "\n"
  + '➤ USD [product-price].' + "\n"
  + '➤ [product-url]' + "\n"
  + '[product-description] ';
exports.LINKEDIN_DEFAULT_TEXT = '[product-title]' + "\n"
  + '➤ USD [product-price].' + "\n"
  + '➤ [product-url]' + "\n"
  + '[product-description] ';
exports.INSTAGRAM_DEFAULT_TEXT = '[product-title]' + "\n"
  + '➤ USD [product-price].' + "\n"
  + '➤ [product-url]' + "\n"
  + '[product-description] ';
exports.TW_DEFAULT_TEXT = '[product-title] USD [product-price]' + "\n" + '[product-url]';
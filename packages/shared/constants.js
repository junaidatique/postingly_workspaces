exports.FACEBOOK_SERVICE = 'Facebook'
exports.FACEBOOK_GRPAHAPI_URL = 'https://graph.facebook.com/v3.2/'
exports.DEV = 'dev'
exports.TEST = 'test'
exports.STAGING = 'staging'
exports.PROD = 'prod'

// schedule states
const NOT_SCHEDULED = 'not_scheduled'
const SCHEDULED = 'scheduled'
const POSTED = 'posted'
const FAILED = 'failed'
const PAUSED = 'paused'

exports.NOT_SCHEDULED = NOT_SCHEDULED
exports.SCHEDULED = SCHEDULED
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

const COLLECTION_OPTION_ALL = 'selectProductsFromAll';
const COLLECTION_OPTION_SELECTED = 'selectProductsFromSelected';
const COLLECTION_OPTION_NOT_SELECTED = 'dontSelectProductsFromSelected';

exports.COLLECTION_OPTION_ALL = COLLECTION_OPTION_ALL;
exports.COLLECTION_OPTION_SELECTED = COLLECTION_OPTION_SELECTED;
exports.COLLECTION_OPTION_NOT_SELECTED = COLLECTION_OPTION_NOT_SELECTED;


exports.PARTNERS = ['shopify', 'bigcommerce'];
exports.SERVICES = ['Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Pinterest', 'Buffer'];
exports.POSTING_TIME_OPTIONS = [POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS];
exports.MERIDIM = ['am', 'pm'];
exports.POST_AS_OPTION = ['none', 'facebookPostAsAlbum', 'facebookPostAsLink', 'facebookPostAsPhoto', 'twitterPostAsSinglePhoto', 'twitterPostAsMultiplePhoto', 'twitterPostAsLink'];
exports.COLLECTION_OPTION = [COLLECTION_OPTION_ALL, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED];

exports.POSTING_SORTORDER = ['newest', 'random'];
exports.SCHEDULE_STATE = [NOT_SCHEDULED, SCHEDULED, POSTED, FAILED, PAUSED];
exports.RULE_TYPE = ['old', 'new', 'sale'];
exports.QUEUE_OPTIONS = ['pause', 'replace'];
exports.LINK_SHORTNER_SERVICES = ['none', 'Pooo.st', 'bit.ly'];
exports.SCHEDULE_TYPE = [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, SCHEDULE_TYPE_FEED, SCHEDULE_TYPE_UPLOAD, SCHEDULE_TYPE_LINK, SCHEDULE_TYPE_BLOG];
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
}
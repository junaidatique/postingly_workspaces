
exports.FACEBOOK_GRPAHAPI_URL = 'https://graph.facebook.com/v4.0/'
exports.TWITTER_API_URL = 'https://api.twitter.com/'
exports.BUFFER_API_URL = 'https://api.bufferapp.com/1/'
exports.DEV = 'dev'
exports.TEST = 'test'
exports.STAGING = 'staging'
exports.PROD = 'prod'
exports.FB_DEFAULT_ALBUM = 'Timeline Photos'

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

// service Profiles
FACEBOOK_PROFILE = 'facebookProfile';
FACEBOOK_PAGE = 'facebookPage';
FACEBOOK_GROUP = 'facebookGroup';
TWITTER_PROFILE = 'twitterProfile';
LINKEDIN_PROFILE = 'linkedinProfile';
LINKEDIN_PAGE = 'linkedinPage';
LINKEDIN_GROUP = 'linkedinGroup';
PINTEREST_PROFILE = 'pinterestProfile';
INSTAGRAM_PROFILE = 'instagramProfile';
INSTAGRAM_BUSINESS = 'instagramBusiness';
BUFFER_INSTAGRAM_PROFILE = 'bufferInstagramProfile';
BUFFER_INSTAGRAM_BUSINESS = 'bufferInstagramBusiness';
BUFFER_PROFILE = 'bufferProfile';
BUFFER_TWITTER_PROFILE = 'bufferTwitterProfile';
BUFFER_FACEBOOK_PROFILE = 'bufferFacebookProfile';
BUFFER_FACEBOOK_PAGE = 'bufferFacebookPage';
BUFFER_FACEBOOK_GROUP = 'bufferFacebookGroup';
BUFFER_LINKEDIN_PROFILE = 'bufferLinkedinProfile';
BUFFER_LINKEDIN_PAGE = 'bufferLinkedinPage';
BUFFER_LINKEDIN_GROUP = 'bufferLinkedinGroup';
BUFFER_PINTEREST_PROFILE = 'bufferPinterestProfile';

exports.FACEBOOK_PROFILE = FACEBOOK_PROFILE;
exports.FACEBOOK_PAGE = FACEBOOK_PAGE;
exports.FACEBOOK_GROUP = FACEBOOK_GROUP;
exports.TWITTER_PROFILE = TWITTER_PROFILE;
exports.LINKEDIN_PROFILE = LINKEDIN_PROFILE;
exports.LINKEDIN_PAGE = LINKEDIN_PAGE;
exports.LINKEDIN_GROUP = LINKEDIN_GROUP;
exports.PINTEREST_PROFILE = PINTEREST_PROFILE;
exports.INSTAGRAM_PROFILE = INSTAGRAM_PROFILE;
exports.INSTAGRAM_BUSINESS = INSTAGRAM_BUSINESS;
exports.BUFFER_INSTAGRAM_PROFILE = BUFFER_INSTAGRAM_PROFILE;
exports.BUFFER_INSTAGRAM_BUSINESS = BUFFER_INSTAGRAM_BUSINESS;
exports.BUFFER_PROFILE = BUFFER_PROFILE;
exports.BUFFER_TWITTER_PROFILE = BUFFER_TWITTER_PROFILE;
exports.BUFFER_FACEBOOK_PROFILE = BUFFER_FACEBOOK_PROFILE;
exports.BUFFER_FACEBOOK_PAGE = BUFFER_FACEBOOK_PAGE;
exports.BUFFER_FACEBOOK_GROUP = BUFFER_FACEBOOK_GROUP;
exports.BUFFER_LINKEDIN_PROFILE = BUFFER_LINKEDIN_PROFILE;
exports.BUFFER_LINKEDIN_PAGE = BUFFER_LINKEDIN_PAGE;
exports.BUFFER_LINKEDIN_GROUP = BUFFER_LINKEDIN_GROUP;
exports.BUFFER_PINTEREST_PROFILE = BUFFER_PINTEREST_PROFILE;

// service posting options
const POST_AS_OPTION_NONE = null
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
const RULE_TYPE_MANUAL = 'manual';
exports.RULE_TYPE_OLD = RULE_TYPE_OLD;
exports.RULE_TYPE_NEW = RULE_TYPE_NEW;
exports.RULE_TYPE_SALE = RULE_TYPE_SALE;
exports.RULE_TYPE_MANUAL = RULE_TYPE_MANUAL;

// QUEUE_OPTIONS
const QUEUE_OPTIONS_PAUSE = 'pause';
const QUEUE_OPTIONS_REPLACE = 'replace';
exports.QUEUE_OPTIONS_PAUSE = QUEUE_OPTIONS_PAUSE;
exports.QUEUE_OPTIONS_REPLACE = QUEUE_OPTIONS_REPLACE;

//LINK_SHORTNER_SERVICES
const LINK_SHORTNER_SERVICES_NONE = 'none'
const LINK_SHORTNER_SERVICES_POOOST = 'pooost'
const LINK_SHORTNER_SERVICES_BITLY = 'bit.ly'
exports.LINK_SHORTNER_SERVICES_NONE = LINK_SHORTNER_SERVICES_NONE;
exports.LINK_SHORTNER_SERVICES_POOOST = LINK_SHORTNER_SERVICES_POOOST;
exports.LINK_SHORTNER_SERVICES_BITLY = LINK_SHORTNER_SERVICES_BITLY;

// Product Sorting
const PRODUCT_SORT_TITLE_ASC = 'title_ASC';
const PRODUCT_SORT_TITLE_DESC = 'title_DESC';
const PRODUCT_SORT_CREATED_ASC = 'createdAt_ASC';
const PRODUCT_SORT_CREATED_DESC = 'createdAt_DESC';
const PRODUCT_SORT_UPDATED_ASC = 'updatedAt_ASC';
const PRODUCT_SORT_UPDATED_DESC = 'updatedAt_DESC';
const PRODUCT_SORT_SCHEDULED_ASC = 'scheduled_ASC';
const PRODUCT_SORT_SCHEDULED_DESC = 'scheduled_DESC';
exports.PRODUCT_SORT_TITLE_ASC = PRODUCT_SORT_TITLE_ASC;
exports.PRODUCT_SORT_TITLE_DESC = PRODUCT_SORT_TITLE_DESC;
exports.PRODUCT_SORT_CREATED_ASC = PRODUCT_SORT_CREATED_ASC;
exports.PRODUCT_SORT_CREATED_DESC = PRODUCT_SORT_CREATED_DESC;
exports.PRODUCT_SORT_UPDATED_ASC = PRODUCT_SORT_UPDATED_ASC;
exports.PRODUCT_SORT_UPDATED_DESC = PRODUCT_SORT_UPDATED_DESC;
exports.PRODUCT_SORT_SCHEDULED_ASC = PRODUCT_SORT_SCHEDULED_ASC;
exports.PRODUCT_SORT_SCHEDULED_DESC = PRODUCT_SORT_SCHEDULED_DESC;


exports.PARTNERS = [PARTNERS_SHOPIFY, PARTNERS_BIGCOMMERCE];
exports.SERVICES = [FACEBOOK_SERVICE, TWITTER_SERVICE, INSTAGRAM_SERVICE, LINKEDIN_SERVICE, PINTEREST_SERVICE, BUFFER_SERVICE];
exports.SERVICE_PROFILES = [
  FACEBOOK_PROFILE,
  FACEBOOK_PAGE,
  FACEBOOK_GROUP,
  TWITTER_PROFILE,
  INSTAGRAM_PROFILE,
  INSTAGRAM_BUSINESS,
  BUFFER_FACEBOOK_PROFILE,
  BUFFER_FACEBOOK_PAGE,
  BUFFER_FACEBOOK_GROUP,
  BUFFER_INSTAGRAM_BUSINESS,
  BUFFER_INSTAGRAM_PROFILE,
  BUFFER_LINKEDIN_GROUP,
  BUFFER_LINKEDIN_PAGE,
  BUFFER_LINKEDIN_PROFILE,
  BUFFER_PINTEREST_PROFILE,
  BUFFER_PROFILE,
  BUFFER_TWITTER_PROFILE,
  LINKEDIN_GROUP,
  LINKEDIN_PAGE,
  LINKEDIN_PROFILE
];
exports.POSTING_TIME_OPTIONS = [POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS];
exports.POST_AS_OPTION = [POST_AS_OPTION_NONE, POST_AS_OPTION_FB_ALBUM, POST_AS_OPTION_FB_LINK, POST_AS_OPTION_FB_PHOTO, POST_AS_OPTION_TW_ALBUM, POST_AS_OPTION_TW_PHOTO, POST_AS_OPTION_TW_LINK];
exports.COLLECTION_OPTION = [COLLECTION_OPTION_ALL, COLLECTION_OPTION_SELECTED, COLLECTION_OPTION_NOT_SELECTED];
exports.POSTING_SORTORDER = [POSTING_SORTORDER_NEWEST, POSTING_SORTORDER_RANDOM];
exports.SCHEDULE_STATE = [NOT_SCHEDULED, PENDING, APPROVED, POSTED, FAILED, PAUSED];
exports.RULE_TYPE = [RULE_TYPE_OLD, RULE_TYPE_NEW, RULE_TYPE_SALE, RULE_TYPE_MANUAL];
exports.QUEUE_OPTIONS = [QUEUE_OPTIONS_PAUSE, QUEUE_OPTIONS_REPLACE];
exports.LINK_SHORTNER_SERVICES = [LINK_SHORTNER_SERVICES_NONE, LINK_SHORTNER_SERVICES_POOOST, LINK_SHORTNER_SERVICES_BITLY];
exports.SCHEDULE_TYPE = [SCHEDULE_TYPE_PRODUCT, SCHEDULE_TYPE_VARIANT, SCHEDULE_TYPE_FEED, SCHEDULE_TYPE_UPLOAD, SCHEDULE_TYPE_LINK, SCHEDULE_TYPE_BLOG];



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

exports.WEBHOOKS = {
  shopify: [
    { webhook: 'products/create', endpoint: 'productsCreate' },
    { webhook: 'products/update', endpoint: 'productsUpdate' },
    { webhook: 'products/delete', endpoint: 'productsDelete' },
    { webhook: 'collections/create', endpoint: 'collectionsCreate' },
    { webhook: 'collections/update', endpoint: 'collectionsUpdate' },
    { webhook: 'collections/delete', endpoint: 'collectionsDelete' },
    { webhook: 'app/uninstalled', endpoint: 'appUninstalled' },
    { webhook: 'shop/update', endpoint: 'shopUpdate' },
  ]
}
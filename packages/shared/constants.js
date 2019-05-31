exports.FACEBOOK_SERVICE = 'Facebook'
exports.FACEBOOK_GRPAHAPI_URL = 'https://graph.facebook.com/v3.2/'
exports.DEV = 'dev'
exports.TEST = 'test'
exports.STAGING = 'staging'
exports.PROD = 'prod'
exports.PARTNERS = ['shopify', 'bigcommerce'];
exports.SERVICES = ['Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Pinterest', 'Buffer'];
exports.POSTING_TIME_OPTIONS = ['postImmediately', 'postBetweenWithInterval', 'customTimings'];
exports.MERIDIM = ['am', 'pm'];
exports.POST_AS_OPTION = ['none', 'facebookPostAsAlbum', 'facebookPostAsLink', 'facebookPostAsPhoto', 'twitterPostAsSinglePhoto', 'twitterPostAsMultiplePhoto', 'twitterPostAsLink'];
exports.COLLECTION_OPTION = ['selectProductsFromAll', 'selectProductsFromSelected', 'dontSelectProductsFromSelected'];
exports.POSTING_SORTORDER = ['newest', 'random'];
exports.SCHEDULE_STATE = ['not_scheduled', 'scheduled', 'posted', 'failed'];
exports.RULE_TYPE = ['old', 'new', 'sale'];
exports.QUEUE_OPTIONS = ['pause', 'replace'];
exports.LINK_SHORTNER_SERVICES = ['none', 'Pooo.st', 'bit.ly'];
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
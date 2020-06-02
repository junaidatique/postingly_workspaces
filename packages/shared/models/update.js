const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
const {
  SERVICES,
  SCHEDULE_STATE,
  POST_AS_OPTION,
  RULE_TYPE,
  SCHEDULE_TYPE,
  NOT_SCHEDULED,
  SERVICE_PROFILES,
  COLLECTION_OPTION,
  POSTING_SORTORDER
} = require('shared/constants');

const IMAGE = {
  imageId: {
    type: Schema.Types.ObjectId,
    ref: 'Image',
    index: true,
  },
  url: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  partnerId: {
    type: String
  }
}

const updateResponse = {
  bufferId: {
    type: String
  },
  tweetId: {
    type: String,
  },
  tweetURL: {
    type: String,
  },
  albumId: {
    type: String,
  },
  serviceImages: [{
    serviceId: {
      type: String,
    },
    servicePostId: {
      type: String
    },
    status: {
      type: Number
    },
    message: {
      type: String
    }
  }]
}

const updateSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Proudct',
    index: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
    ref: 'Variant',
    index: true,
  },
  rule: {
    type: Schema.Types.ObjectId,
    ref: 'Rule',
    index: true,
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    index: true,
  },
  uniqKey: {
    type: String,
    required: true,
    unique: true
  },
  images: [IMAGE],
  scheduleType: {
    type: String,
    enum: SCHEDULE_TYPE,
    index: true, // product, blog etc
  },
  postType: {
    type: String,
    enum: RULE_TYPE,
    index: true, // 'old', 'new', 'sale'
  },
  service: {
    type: String,
    enum: SERVICES,
    index: true,
  },
  serviceProfile: {
    type: String,
    enum: SERVICE_PROFILES,
    index: true,
  },
  autoApproveUpdates: {
    type: Boolean,
    default: false,
  },
  autoAddCaptionOfUpdates: {
    type: Boolean,
    default: false,
  },
  captionsUpdated: {
    type: Boolean,
    default: false,
    index: true,
  },
  postAsOption: {
    type: String,
    enum: POST_AS_OPTION,
    index: true,
  },
  scheduleTime: {
    type: Date,
    required: true,
    index: true,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  postingTime: {
    type: Date,
    index: true,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  scheduleWeek: {
    type: Number,
    required: false,
    default: null,
    index: true,
  },
  scheduleDayOfYear: {
    type: Number,
    required: false,
    default: null,
    index: true,
  },
  text: {
    type: String
  },
  suggestedText: {
    type: String
  },
  scheduleState: {
    type: String,
    enum: SCHEDULE_STATE, // NOT_SCHEDULED, SCHEDULED, POSTED, FAILED, PAUSED
    default: NOT_SCHEDULED,
    index: true,
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  failedMessage: {
    type: String
  },
  userEdited: {
    type: Boolean,
    default: false,
    index: true,
  },
  response: updateResponse,
  postingCollectionOption: {
    type: String,
    enum: COLLECTION_OPTION,
    index: true,
  },
  allowedCollections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ],
  disallowedCollections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ],
  allowZeroQuantity: {
    type: Boolean,
    index: true,
  },
  postingProductOrder: {
    type: String,
    enum: POSTING_SORTORDER,
    index: true,
  },
  postTimingId: {
    type: String,
    index: true,
  },
  titleForCaption: {
    type: String,
  },
  priceForCaption: {
    type: String,
  },
  descriptionForCaption: {
    type: String,
  },
  productExternalURL: {
    type: String,
  },
  URLForCaption: {
    type: String,
    index: true,
  },
  defaultShortLinkService: {
    type: String
  },
  bufferStatus: {
    type: String
  },
  isStoreDeleted: {
    type: Boolean
  },
  productCollections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ]

});


updateSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Update;
}

updateSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Update', updateSchema);
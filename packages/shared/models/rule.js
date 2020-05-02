const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { SERVICES,
  POSTING_TIME_OPTIONS,
  POST_AS_OPTION,
  COLLECTION_OPTION,
  POSTING_SORTORDER,
  RULE_TYPE,
  QUEUE_OPTIONS
} = require('shared/constants');

const POST_TIMING = {

  postingHour: {
    type: Number
  },
  postingMinute: {
    type: Number
  },
  postingDays: [String],
  postingCollectionOption: {
    type: String,
    enum: COLLECTION_OPTION
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ],
};

const SELECTED_POST_TIMES = {
  dayName: {
    type: String
  },
  dayKey: {
    type: String
  },
  postingTimesTotal: {
    type: Number
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  times: [
    {
      hour: {
        type: String
      },
      minute: {
        type: String
      }
    }
  ]
}


const CAPTION = {
  captionCollectionOption: {
    type: String,
    enum: COLLECTION_OPTION
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ],
  isDefault: {
    type: Boolean,
    default: false,
  },
  captionTexts: { type: String }
}

const ruleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  service: {
    type: String,
    enum: SERVICES,
    index: true,
  },
  type: {
    type: String,
    enum: RULE_TYPE,
    index: true,
  },
  profiles: [{
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    index: true,
  }],
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    index: true,
  },
  postingTimeOption: {
    type: String,
    enum: POSTING_TIME_OPTIONS, // POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS
    index: true
  },
  postTimings: [POST_TIMING], // actual timings. 
  selectedProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true,
  }],
  postAsOption: {
    type: String,
    enum: POST_AS_OPTION,
    index: true, // post as link, phtot etc.
  },
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
  postAsVariants: {
    type: Boolean,
    default: false,
    index: true,
  },
  rotateImages: {
    type: Boolean,
    default: false,
    index: true,
  },
  rotateImageLimit: {
    type: Number,
    default: 0,
  },

  postingProductOrder: {
    type: String,
    enum: POSTING_SORTORDER,
    index: true,
  },
  queueOption: {
    type: String,
    enum: QUEUE_OPTIONS // 'pause', 'replace'
  },
  captions: [CAPTION],
  startDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  endDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  allowProductRepetition: {
    type: Boolean,
    default: false,
  },
  productRepeatFrequency: {
    type: Number
  },
  productRepeatFinalDate: {
    type: Date,
    get: date => (date) ? date.toISOString() : null,
  }
});

ruleSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Rule;
}

module.exports = mongoose.model('Rule', ruleSchema);
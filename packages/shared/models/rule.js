const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { SERVICES, POSTING_TIME_OPTIONS, POST_AS_OPTION, COLLECTION_OPTION, POSTING_SORTORDER, TEST, RULE_TYPE, QUEUE_OPTIONS } = require('shared/constants');

const POST_TIMING = {
  postingInterval: {
    type: Number
  },
  startPostingHour: {
    type: Number
  },
  endPostingHour: {
    type: Number
  },
  postingHour: {
    type: Number
  },
  postingMinute: {
    type: Number
  },
  postingDays: [Number]
};

CAPTION_TEXT = {
  text: {
    type: String,
  },

  startDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  endDate: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
}

const CAPTION = {
  collectionOption: {
    type: String,
    enum: COLLECTION_OPTION
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection'
    }
  ],
  isDefault: {
    type: Boolean,
    default: false,
  },
  captionTexts: [CAPTION_TEXT]
}

const ruleSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  service: {
    type: String,
    enum: SERVICES
  },
  type: {
    type: String,
    enum: RULE_TYPE
  },
  profiles: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    }
  ],

  postingTimeOption: {
    type: String,
    enum: POSTING_TIME_OPTIONS, // POST_IMMEDIATELY, POST_BETWEEN_WITH_INTERVAL, CUSTOM_TIMINGS
    index: true
  },
  postTimings: [POST_TIMING], // actual timings. 
  postAsOption: {
    type: String,
    enum: POST_AS_OPTION // post as link, phtot etc.
  },
  collectionOption: {
    type: String,
    enum: COLLECTION_OPTION
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection'
    }
  ],
  allowZeroQuantity: {
    type: Boolean
  },
  postAsVariants: {
    type: Boolean,
    default: false,
  },
  rotateImages: {
    type: Boolean,
    default: false,
  },
  repeatFrequency: {
    type: Number
  },
  postingProductOrder: {
    type: String,
    enum: POSTING_SORTORDER
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
  }
});

ruleSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Rule;
}

module.exports = mongoose.model('Rule', ruleSchema);
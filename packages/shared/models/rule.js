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

const CAPTION = {
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
  updates: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Update'
    }
  ],
  postingTimeOption: {
    type: String,
    enum: POSTING_TIME_OPTIONS,
    index: true
  },
  postTimings: [POST_TIMING],
  postAsOption: {
    type: String,
    enum: POST_AS_OPTION
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
    enum: QUEUE_OPTIONS
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
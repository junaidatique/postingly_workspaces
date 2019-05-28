const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { SERVICES, POSTING_TIME_OPTIONS, POST_AS_OPTION, MERIDIM, COLLECTION_OPTION, POSTING_SORTORDER, TEST } = require('shared/constants');

let createUpdates;

if (process.env.IS_OFFLINE == true || process.env.STAGE == TEST) {
  createUpdates = require('functions').createUpdates.createUpdates;
}

const POST_TIMING = {
  postingNumbererval: {
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
  postingMeridiem: {
    type: String,
    enum: MERIDIM
  },
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
  profiles: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    }
  ],
  postingTimeOption: {
    type: String,
    enum: POSTING_TIME_OPTIONS
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
    type: Boolean
  },
  postingProductOrder: {
    type: String,
    enum: POSTING_SORTORDER
  },
  captions: [CAPTION]
});

ruleSchema.set('timestamps', true);

ruleSchema.post('save', function (doc) {
  if (process.env.IS_OFFLINE == true || process.env.STAGE == TEST) {
    createUpdates({ id: doc.id });
  }
});

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Rule;
}

module.exports = mongoose.model('Rule', ruleSchema);
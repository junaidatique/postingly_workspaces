const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const { SERVICES, SCHEDULE_STATE, POST_AS_OPTION, RULE_TYPE, SCHEDULE_TYPE, NOT_SCHEDULED, SERVICE_PROFILES } = require('shared/constants');

const IMAGE = {
  imageId: {
    type: Schema.Types.ObjectId,
  },
  url: {
    type: String
  },
  thumbnailUrl: {
    type: String
  }
}

const updateSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Proudct'
  },
  variant: {
    type: Schema.Types.ObjectId,
    ref: 'Variant'
  },
  rule: {
    type: Schema.Types.ObjectId,
    ref: 'Rule'
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  uniqKey: {
    type: String,
    required: true,
    unique: true
  },
  images: [IMAGE],
  scheduleType: {
    type: String,
    enum: SCHEDULE_TYPE // product, blog etc
  },
  postType: {
    type: String,
    enum: RULE_TYPE // 'old', 'new', 'sale'
  },
  service: {
    type: String,
    enum: SERVICES
  },
  serviceProfile: {
    type: String,
    enum: SERVICE_PROFILES
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
  },
  postAsOption: {
    type: String,
    enum: POST_AS_OPTION
  },
  scheduleTime: {
    type: Date,
    required: true,
    get: date => (date !== undefined) ? date.toISOString() : null,
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
    default: NOT_SCHEDULED
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
    default: false
  }
});


updateSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Update;
}

module.exports = mongoose.model('Update', updateSchema);
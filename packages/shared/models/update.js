const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const { SERVICES, SCHEDULE_STATE, POST_AS_OPTION, RULE_TYPE, SCHEDULE_TYPE } = require('shared/constants');

const IMAGE = {
  url: {
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
  images: [IMAGE],
  scheduleType: {
    type: String,
    enum: SCHEDULE_TYPE
  },
  postType: {
    type: String,
    enum: RULE_TYPE // 'old', 'new', 'sale'
  },
  service: {
    type: String,
    enum: SERVICES
  },
  autoApproveUpdates: {
    type: Boolean,
    default: false,
  },
  autoAddCaptionOfUpdates: {
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
  },
  text: {
    type: String
  },
  scheduleState: {
    type: String,
    enum: SCHEDULE_STATE // NOT_SCHEDULED, SCHEDULED, POSTED, FAILED, PAUSED
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
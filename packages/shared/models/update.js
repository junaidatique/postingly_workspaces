const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const { SERVICES, SCHEDULE_STATE, POST_AS_OPTION, RULE_TYPE } = require('shared/constants');

const updateSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  postType: {
    type: String,
    enum: RULE_TYPE
  },
  service: {
    type: String,
    enum: SERVICES
  },
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  rule: {
    type: Schema.Types.ObjectId,
    ref: 'Rule'
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
    Type: String
  },
  scheduleState: {
    type: String,
    enum: SCHEDULE_STATE
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  isFailed: {
    type: Boolean,
    default: false,
    index: true
  },
  failedMessage: {
    type: String
  }
});


updateSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Update;
}

module.exports = mongoose.model('Update', updateSchema);
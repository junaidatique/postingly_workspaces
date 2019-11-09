const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
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
  scheduleWeek: {
    type: Number,
    required: false,
    default: null,
  },
  scheduleDayOfYear: {
    type: Number,
    required: false,
    default: null,
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
  },
  response: updateResponse
});


updateSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Update;
}

updateSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Update', updateSchema);
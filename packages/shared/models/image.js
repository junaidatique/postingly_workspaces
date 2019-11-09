const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const SHARE_HISTORY = {
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    index: true,
  },
  counter: Number
}

const imageSchema = new Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
    ref: 'Variant',
    index: true,
  },
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
  shareHistory: [SHARE_HISTORY]
});

imageSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Image;
}

module.exports = mongoose.model('Image', imageSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { PARTNERS } = require('shared/constants');

const SHARE_HISTORY = {
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  counter: Number
}

const IMAGES_SCHEMA = {
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
}

const variantSchema = new Schema({
  images: [IMAGES_SCHEMA],
  title: {
    type: String,
    required: true,
  },
  partner: {
    type: String,
    required: true,
    index: true,
    enum: PARTNERS
  },
  partnerId: {
    type: String,
    required: true,
  },
  partnerCreatedAt: {
    type: Date,
    index: true,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  partnerUpdatedAt: {
    type: Date,
    index: true,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  uniqKey: {
    type: String,
    required: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  quantity: {
    type: Number
  },
  suggestedText: {
    type: String
  },
  price: {
    type: Number
  },
  salePrice: {
    type: Number
  },
  onSale: {
    type: Boolean,
    default: false,
    index: true
  },
  position: {
    type: Number,
  },
  postableByImage: {
    type: Boolean,
    default: false,
    index: true
  },
  postableByQuantity: {
    type: Boolean,
    default: false,
    index: true
  },
  postableByPrice: {
    type: Boolean,
    default: false,
    index: true
  },
  postableIsNew: {
    type: Boolean,
    default: false,
    index: true
  },
  postableBySale: {
    type: Boolean,
    default: false,
    index: true
  },
  shareHistory: [SHARE_HISTORY]
});

variantSchema.set('timestamps', true);

return variantSchema;
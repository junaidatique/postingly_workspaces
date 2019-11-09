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

const variantSchema = new Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true,
    }
  ],
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true,
  },
  images: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Image',
      index: true,
    }
  ],
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


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Variant;
}

module.exports = mongoose.model('Variant', variantSchema);
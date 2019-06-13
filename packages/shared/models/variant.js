const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { IMAGE_SCHEMA } = require('shared/constants');


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
    ref: 'Store'
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection'
    }
  ],
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product'
  },
  images: [IMAGE_SCHEMA],
  title: {
    type: String,
    required: true,
  },
  partner: {
    type: String,
    required: true,
    index: true
  },
  partnerId: {
    type: String,
    required: true,
  },
  partnerCreatedAt: {
    type: Date,
    get: date => (date !== undefined) ? date.toISOString() : null,
  },
  partnerUpdatedAt: {
    type: Date,
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
  price: {
    type: mongoose.Decimal128
  },
  salePrice: {
    type: mongoose.Decimal128
  },
  onSale: {
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
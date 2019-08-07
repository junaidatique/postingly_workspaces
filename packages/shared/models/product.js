const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { LINK_SHORTNER_SERVICES, PARTNERS } = require('shared/constants');

const SHORT_LINK = {
  service: {
    type: String,
    enum: LINK_SHORTNER_SERVICES
  },
  url: {
    type: String,
  }
}

const SHARE_HISTORY = {
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  counter: Number
}

const productSchema = new Schema({
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
  variants: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Variant'
    }
  ],
  title: {
    type: String,
    required: true,
  },
  url: [SHORT_LINK],
  images: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Image'
    }
  ],
  description: {
    type: String
  },
  suggestedCaption: {
    type: String
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
  partnerSpecificUrl: {
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
  minimumPrice: {
    type: mongoose.Decimal128
  },
  maximumPrice: {
    type: mongoose.Decimal128
  },
  onSale: {
    type: Boolean,
    default: false,
    index: true
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


productSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Product;
}

module.exports = mongoose.model('Product', productSchema);
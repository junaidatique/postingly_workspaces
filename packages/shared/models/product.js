const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const VARIANT_SCHEMA = require('./variant')
const mongoosePaginate = require('mongoose-paginate');
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
    ref: 'Profile',
    index: true,
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

const productSchema = new Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      index: true
    }
  ],
  variants: [VARIANT_SCHEMA],
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
  images_list: [IMAGES_SCHEMA],
  description: {
    type: String
  },
  suggestedText: {
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
  minimumPrice: {
    type: Number
  },
  maximumPrice: {
    type: Number
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
productSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Product', productSchema);
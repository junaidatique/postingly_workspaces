const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { PARTNERS } = require('shared/constants');
const collectionSchema = new Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  products: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Product'
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
});

collectionSchema.set('timestamps', true);


if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Collection;
}

module.exports = mongoose.model('Collection', collectionSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { SERVICES, SERVICE_PROFILES } = require('shared/constants');
const profileSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Profile'
  },
  children: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile'
    }
  ],
  name: {
    type: String,
  },
  uniqKey: {
    type: String,
    required: true,
    unique: true
  },
  avatarUrl: {
    type: String
  },
  serviceUserId: {
    type: String
  },
  serviceUsername: {
    type: String
  },
  profileURL: {
    type: String
  },
  accessToken: {
    type: String
  },
  accessTokenSecret: {
    type: String
  },
  service: {
    type: String,
    enum: SERVICES
  },
  serviceProfile: {
    type: String,
    enum: SERVICE_PROFILES
  },
  bufferId: {
    type: String
  },
  isConnected: {
    type: Boolean,
    default: true,
  },
  isTokenExpired: {
    type: Boolean,
    default: false,
  },
  isSharePossible: {
    type: Boolean,
    default: true,
  },
});

profileSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Profile;
}

module.exports = mongoose.model('Profile', profileSchema);
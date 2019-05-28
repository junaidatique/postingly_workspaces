const mongoose = require('mongoose');
const Schema = mongoose.Schema;
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
    type: String
  },
  serviceProfile: {
    type: String
  },
  bufferId: {
    type: String
  },
  isConnected: {
    type: Boolean
  },
  isTokenExpired: {
    type: Boolean
  },
  isSharePossible: {
    type: Boolean
  },
});

profileSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Profile;
}

module.exports = mongoose.model('Profile', profileSchema);
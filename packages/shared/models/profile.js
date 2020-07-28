const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { SERVICES, SERVICE_PROFILES, FB_ALBUM_TYPES } = require('shared/constants');
const FB_ALBUMS = {
  albumId: {
    type: String
  },
  name: {
    type: String,
  },
  type: {
    type: String,
    enum: FB_ALBUM_TYPES
  }
}
const profileSchema = new mongoose.Schema({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    index: true,
  },
  children: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      index: true,
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
    type: String,
    index: true,
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
    enum: SERVICES,
    index: true,
  },
  serviceProfile: {
    type: String,
    enum: SERVICE_PROFILES,
    index: true,
  },
  bufferId: {
    type: String
  },
  isConnected: {
    type: Boolean,
    default: false,
    index: true,
  },
  isTokenExpired: {
    type: Boolean,
    default: false,
    index: true,
  },
  isSharePossible: {
    type: Boolean,
    default: true,
  },
  fbDefaultAlbum: {
    type: String,
    default: null
  },
  fbAlbums: [FB_ALBUMS]
});

profileSchema.set('timestamps', true);

if (process.env.IS_OFFLINE) {
  delete mongoose.connection.models.Profile;
}

module.exports = mongoose.model('Profile', profileSchema);
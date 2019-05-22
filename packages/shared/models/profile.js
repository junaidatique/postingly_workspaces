// const dynamoose = require('shared/helpers/db');

// const Schema = dynamoose.Schema;

// const profileSchema = new Schema({
//   id: {
//     type: String,
//     hashKey: true
//   },
//   storeId: {
//     type: String
//   },
//   parentProfile: {
//     type: String
//   },
//   name: {
//     type: String
//   },
//   avatarUrl: {
//     type: String
//   },
//   serviceUserId: {
//     type: String
//   },
//   serviceUsername: {
//     type: String
//   },
//   profileURL: {
//     type: String
//   },
//   accessToken: {
//     type: String
//   },
//   accessTokenSecret: {
//     type: String
//   },
//   service: {
//     type: String
//   },
//   serviceProfile: {
//     type: String
//   },
//   bufferId: {
//     type: String
//   },
//   isConnected: {
//     type: Boolean
//   },
//   isTokenExpired: {
//     type: Boolean
//   },
//   isSharePossible: {
//     type: Boolean
//   },

// }, {
//     throughput: {
//       read: 5,
//       write: 5
//     },
//     timestamps: true,
//     errorUnknown: true
//   });

// module.exports = dynamoose.model(process.env.PROFILE_TABLE, profileSchema);

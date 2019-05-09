const gql = require('apollo-server-express').gql;
const typeDefs = gql`
input ModelStringFilterInput {
  ne: String
  eq: String
  le: String
  lt: String
  ge: String
  gt: String
  contains: String
  notContains: String
  between: [String]
  beginsWith: String
}

input ModelIDFilterInput {
  ne: ID
  eq: ID
  le: ID
  lt: ID
  ge: ID
  gt: ID
  contains: ID
  notContains: ID
  between: [ID]
  beginsWith: ID
}

input ModelIntFilterInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  contains: Int
  notContains: Int
  between: [Int]
}

input ModelFloatFilterInput {
  ne: Float
  eq: Float
  le: Float
  lt: Float
  ge: Float
  gt: Float
  contains: Float
  notContains: Float
  between: [Float]
}

input ModelBooleanFilterInput {
  ne: Boolean
  eq: Boolean
}
enum ModelSortDirection {
  ASC
  DESC
}
type Store {
  id: ID!
  userId: String!
  partner: String!
  partnerId: String
  partnerPlan: String
  title: String!
  storeUrl: String
  partnerSpecificUrl: String
  partnerCreatedAt: String
  partnerUpdatedAt: String
  timezone: String
  moneyFormat: String
  moneyWithCurrencyFormat: String
  numberOfProducts: String
  noOfActiveProducts: String
  numberOfScheduledPosts: String
  numberOfPosted: String
  productsLastUpdated: String
  isCharged: String
  chargedMethod: String
  chargeId: String
  chargeDate: String
  isUninstalled: String
  profiles(filter: ModelProfileFilterInput, sortDirection: ModelSortDirection, limit: Int, nextToken: String): ModelProfileConnection
}


type ModelStoreConnection {
  items: [Store]
  nextToken: String
}

input ModelStoreFilterInput {
  id: ModelIDFilterInput
  name: ModelStringFilterInput
  and: [ModelStoreFilterInput]
  or: [ModelStoreFilterInput]
  not: ModelStoreFilterInput
}

type Profile {
  id: ID!
  name: String!
  avatarUrl: String
  serviceUsername: String
  serviceUserId: String
  profileURL: String
  accessToken: String
  accessTokenSecret: String
  service: Service
  serviceProfile: ServiceProfile
  isConnected: Boolean
  isTokenExpired: Boolean
  isSharePossible: Boolean
  store: Store
}


type ModelProfileConnection {
  items: [Profile]
  nextToken: String
}

input ModelProfileFilterInput {
  id: ModelIDFilterInput
  title: ModelStringFilterInput
  and: [ModelProfileFilterInput]
  or: [ModelProfileFilterInput]
  not: ModelProfileFilterInput
}

enum Service { 
  Facebook
  Twitter
  Instagram
  linkedin
  Pinterest
  Buffer
}

enum ServiceProfile {
  facebook_profile
  facebook_page
  facebook_group
  twitter_profile
  linkedin_profile
  linkedin_page
  linkedin_group
  pinterest_profile
  instagram_profile
  instagram_business
  buffer_instagram_profile
  buffer_instagram_business
  buffer_profile
  buffer_twitter_profile
  buffer_facebook_profile
  buffer_facebook_page
  buffer_facebook_group
  buffer_linkedin_profile
  buffer_linkedin_page
  buffer_linkedin_group
  buffer_pinterest_profile
}



type Query {
  listStores(filter: ModelStoreFilterInput, limit: Int, nextToken: String): ModelStoreConnection
  books: [Book]
}

type Book {
  title: String
  author: String
}

`;

// export default typeDefs
module.exports = typeDefs;
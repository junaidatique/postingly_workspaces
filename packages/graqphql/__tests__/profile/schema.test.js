const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const mockServer = require('graphql-tools').mockServer;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const graphql = require('graphql').graphql;

const typeDefs = require('../../schema/graphql');

const Service = 'facebook';
const ServiceProfile = 'facebook_page';
const Store = ''

item = {
  id: '1',
  name: 'Title',
  avatarUrl: 'Title',
  serviceUsername: 'Title',
  serviceUserId: 'Title',
  profileURL: 'Title',
  accessToken: 'Title',
  accessTokenSecret: 'Title',
  service: 'Title',
  serviceProfile: 'Title',
  isConnected: false,
  isTokenExpired: false,
  isSharePossible: false,
  store: 'Title'
}
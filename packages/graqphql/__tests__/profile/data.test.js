const graphql = require('graphql').graphql;
const mongoose = require('mongoose');
const schema = require('../executableSchema').schema;

const storeStub = require("../store/stubs");
const profileStub = require("./stubs");

describe('Profile Model', () => {
  let storeId, profiles;
  // beforeEach
  beforeAll(async (done) => {
    if (mongoose.connection.readyState === 2) {
      mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true }, async function () {
        for (let i in mongoose.connection.collections) {
          const res = await mongoose.connection.collections[i].deleteMany({ _id: { $exists: true } });
        }
      })
    }
    const storeDetail = await storeStub.createStoreStub();
    storeId = storeDetail._id;
    profiles = await profileStub.createFBPageProfileStub(storeId, false, 8);
    done();
  });

  // -------------------------- listNotConnectedProfilesTestCase --------------------------
  test(`List Not Connected Profiles`, async () => {
    const profilesExpected = {}
    const listNotConnectedProfilesTestCase = {
      id: 'List Not Connected Profiles',
      query: `
      query {
        listProfiles(storeId: "${storeId}", service: Facebook) {
          id
          name
          avatarUrl
          uniqKey
          serviceUsername
          serviceUserId
          profileURL
          accessToken
          accessTokenSecret
          service
          serviceProfile
          isConnected
          isTokenExpired
        }
      }
    `,
      variables: {},
      context: {},
      expected: { data: { listProfiles: [profilesExpected] } }
    };
    const result = await graphql(schema, listNotConnectedProfilesTestCase.query, null, listNotConnectedProfilesTestCase.context, listNotConnectedProfilesTestCase.variables);
    expect(result.data.listProfiles.length).toBe(8);
  }, 30000);

  // -------------------------- updateNotConnectedProfilesTestCase --------------------------
  test(`Update Not Connected Profiles`, async () => {
    const profilesExpected = {}
    let updatedProfiles = [];
    for (let i = 0; i < 8; i++) {
      if ((i % 2) == 0) {
        updatedProfiles.push({ id: profiles[i]._id, isConnected: true });
      }
    } 1
    updatedProfileParams = JSON.stringify(updatedProfiles).replace(/\"([^(\")"]+)\":/g, "$1:")
    const updateNotConnectedProfilesTestCase = {
      id: 'List Not Connected Profiles',
      query: `
      mutation {
        updateProfile(input: ${updatedProfileParams}) {
          id
          
        }
      }
    `,
      variables: {},
      context: {},
      expected: { data: { updateProfile: [profilesExpected] } }
    };
    const result = await graphql(schema, updateNotConnectedProfilesTestCase.query, null, updateNotConnectedProfilesTestCase.context, updateNotConnectedProfilesTestCase.variables);
    expect(result.data.updateProfile.length).toBe(4);
  }, 30000);




})
const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const requireGraphQLFile = require('require-graphql-file');
const mockServer = require('graphql-tools').mockServer;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const graphql = require('graphql').graphql;
// const typeDefs = require('../../schema/graphql');
const typeDefs = requireGraphQLFile('../../schema/schema');

const profile = {
  id: '1',
  name: 'Title',
  avatarUrl: 'Title',
  serviceUsername: 'Title',
  serviceUserId: 'Title',
  profileURL: 'Title',
  accessToken: 'Title',
  accessTokenSecret: 'Title',
  isConnected: false,
  isTokenExpired: false,
}

const rule_post_time = {
  id: '1',
  startPostingHour: 1,
  endPostingHour: 1,
  postingInterval: 1,
  postingHour: 1,
  postingMinute: 1,
}
const collection_item = {
  id: '1',
  name: 'Title',
  store: 'Title',
}

const caption = {
  id: '1',
  text: 'Title',
  startDate: 'Title',
  endDate: 'Title'
}

const item = {
  id: '1',
  store: {
    id: '1',
    title: 'Title',
    url: 'Title',
    userId: 'Title',
    partner: 'shopify',
    partnerId: 'Title',
    partnerPlan: 'Title',
    partnerSpecificUrl: 'Title',
    partnerCreatedAt: 'Title',
    partnerUpdatedAt: 'Title',
    partnerToken: 'Title',
    uniqKey: 'Title',
  },

  profiles: [
    profile,
    profile
  ],

  postTimings: [rule_post_time, rule_post_time],
  allowZeroQuantity: false,
  postAsVariants: false,
  captions: [caption, caption]
}

const createRuleTestCase = {
  id: 'Create Rule',
  query: `
      mutation {
        manageRule (input: {store: "1", service: Facebook}) {
          id
          postAsVariants
          allowZeroQuantity
          postTimings {
            id
            postingHour
            endPostingHour
            postingInterval
            postingMinute
            startPostingHour
          }
          profiles {
            id
            name
            serviceUserId
            serviceUsername
            profileURL
            avatarUrl
            accessToken
            accessTokenSecret
            isConnected
            isTokenExpired
          }
          captions {
            id
            text
            startDate
            endDate
          }
          store {
            id
            userId
            title
            url
            partner
            partnerId
            partnerPlan
            partnerSpecificUrl
            partnerCreatedAt
            partnerUpdatedAt
            partnerToken
            uniqKey
          }
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { manageRule: item } }
};
const getRuleAfterCreationTestCase = {
  id: 'Get Rule after creation',
  query: `
      query {
        getRule (id: "1") {
          id
          postAsVariants
          allowZeroQuantity
          postTimings {
            id
            postingHour
            endPostingHour
            postingInterval
            postingMinute
            startPostingHour
          }
          profiles {
            id
            name
            serviceUserId
            serviceUsername
            profileURL
            avatarUrl
            accessToken
            accessTokenSecret
            isConnected
            isTokenExpired
          }
          captions {
            id
            text
            startDate
            endDate
          }
          store {
            id
            userId
            title
            url
            partner
            partnerId
            partnerPlan
            partnerSpecificUrl
            partnerCreatedAt
            partnerUpdatedAt
            partnerToken
            uniqKey
          }

        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { getRule: item } }
};

const getRuleAfterUpdateTestCase = {
  id: 'Create Rule after creation',
  query: `
      query {
        listRules {
          id
          postAsVariants
          allowZeroQuantity
          postTimings {
            id
            postingHour
            endPostingHour
            postingInterval
            postingMinute
            startPostingHour
          }
          profiles {
            id
            name
            serviceUserId
            serviceUsername
            profileURL
            avatarUrl
            accessToken
            accessTokenSecret
            isConnected
            isTokenExpired
          }
          captions {
            id
            text
            startDate
            endDate
          }
          store {
            id
            userId
            title
            url
            partner
            partnerId
            partnerPlan
            partnerSpecificUrl
            partnerCreatedAt
            partnerUpdatedAt
            partnerToken
            uniqKey
          }

        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { listRules: [item, item] } }
};


// const cases = [createRuleTestCase, getRuleAfterCreationTestCase, updateRuleTestCase, getRuleAfterUpdateTestCase];
const cases = [createRuleTestCase, getRuleAfterCreationTestCase, getRuleAfterUpdateTestCase];

describe('Schema', () => {
  const mockSchema = makeExecutableSchema({ typeDefs });
  addMockFunctionsToSchema({
    schema: mockSchema,
    mocks: {
      Boolean: () => false,
      ID: () => '1',
      Int: () => 1,
      Float: () => 1.1,
      String: () => 'Title',
    }
  });

  test('Has valid type definitions', async () => {
    expect(async () => {
      const MockServer = mockServer(typeDefs);

      await MockServer.query(`{ __schema { types { name } } }`);
    }).not.toThrow();
  });

  cases.forEach(obj => {
    const { id, query, variables, context: ctx, expected } = obj;

    test(`Testing Query: ${id}`, async () => {
      return await expect(
        graphql(mockSchema, query, null, { ctx }, variables)
      ).resolves.toEqual(expected);
    });
  });

});
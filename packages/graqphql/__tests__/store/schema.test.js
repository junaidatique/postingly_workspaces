const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;
const mockServer = require('graphql-tools').mockServer;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const graphql = require('graphql').graphql;
const typeDefs = require('../../schema/graphql');

const item = {
  id: '1',
  userId: 'Title',
  partner: 'Title',
  partnerId: 'Title',
  partnerPlan: 'Title',
  title: 'Title',
  storeUrl: 'Title',
  partnerSpecificUrl: 'Title',
  partnerCreatedAt: 'Title',
  partnerUpdatedAt: 'Title',
  partnerToken: 'Title',
  timezone: 'Title',
  moneyFormat: 'Title',
  moneyWithCurrencyFormat: 'Title',
  numberOfProducts: 1,
  noOfActiveProducts: 1,
  numberOfScheduledPosts: 1,
  numberOfPosted: 1,
  productsLastUpdated: 'Title',
  isCharged: false,
  chargedMethod: 'Title',
  chargeId: 'Title',
  chargeDate: 'Title',
  isUninstalled: false,
}

const listStoresCase = {
  id: 'List Stores Query',
  query: `
      query {
        listStores {
          items{
            id
            userId
            partner
            partnerId
            partnerPlan
            title
            storeUrl
            partnerSpecificUrl
            partnerCreatedAt
            partnerUpdatedAt
            partnerToken
            timezone
            moneyFormat
            moneyWithCurrencyFormat
            numberOfProducts
            noOfActiveProducts
            numberOfScheduledPosts
            numberOfPosted
            productsLastUpdated
            isCharged
            chargedMethod
            chargeId
            chargeDate
            isUninstalled
          }
        }
      }
    `,
  variables: {},
  context: {},
  expected: {
    data: {
      listStores: {
        items: [
          item,
          item
        ]
      }
    }
  }
};
const getStoreCase = {
  id: 'List Stores Query',
  query: `
      query {
        getStore(id: "1") {
          id
          userId
          partner
          partnerId
          partnerPlan
          title
          storeUrl
          partnerSpecificUrl
          partnerCreatedAt
          partnerUpdatedAt
          partnerToken
          timezone
          moneyFormat
          moneyWithCurrencyFormat
          numberOfProducts
          noOfActiveProducts
          numberOfScheduledPosts
          numberOfPosted
          productsLastUpdated
          isCharged
          chargedMethod
          chargeId
          chargeDate
          isUninstalled
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { getStore: item } }
};
const createStoreCase = {
  id: 'Create Store Mutation',
  query: `
      mutation {
        createStore (input: {id: "Title", userId: "Title", partner: "Title", title: "Title"}) {
          id
          userId
          partner
          partnerId
          partnerPlan
          title
          storeUrl
          partnerSpecificUrl
          partnerCreatedAt
          partnerUpdatedAt
          partnerToken
          timezone
          moneyFormat
          moneyWithCurrencyFormat
          numberOfProducts
          noOfActiveProducts
          numberOfScheduledPosts
          numberOfPosted
          productsLastUpdated
          isCharged
          chargedMethod
          chargeId
          chargeDate
          isUninstalled
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { createStore: item } }
};
const updateStoreCase = {
  id: 'Update Store Mutation',
  query: `
      mutation {
        updateStore (input: {id: "Title", title: "Title"}) {
          id
          userId
          partner
          partnerId
          partnerPlan
          title
          storeUrl
          partnerSpecificUrl
          partnerCreatedAt
          partnerUpdatedAt
          partnerToken
          timezone
          moneyFormat
          moneyWithCurrencyFormat
          numberOfProducts
          noOfActiveProducts
          numberOfScheduledPosts
          numberOfPosted
          productsLastUpdated
          isCharged
          chargedMethod
          chargeId
          chargeDate
          isUninstalled
        }
      }
    `,
  variables: {},
  context: {},
  expected: { data: { updateStore: item } }
};

const cases = [listStoresCase, getStoreCase, createStoreCase, updateStoreCase];

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
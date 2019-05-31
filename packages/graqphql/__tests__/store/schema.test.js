const addMockFunctionsToSchema = require('graphql-tools').addMockFunctionsToSchema;

const graphql = require('graphql').graphql;
const typeDefs = require('../mockSchema').typeDefs;

const mockSchema = makeExecutableSchema({ typeDefs: typeDefs });

const item = {
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
  expected: {
    data: {
      listStores: [
        item,
        item
      ]
    }
  }
};
const getStoreCase = {
  id: 'Get Store Query',
  query: `
      query {
        getStore(uniqKey: "1") {
          id
          userId
          partner
          partnerId
          partnerPlan
          title
          url
          partnerSpecificUrl
          partnerCreatedAt
          partnerUpdatedAt
          partnerToken
          uniqKey
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
        createStore (input: {id: "Title", userId: "Title", partner: "Title", title: "Title", partnerId: "Title", partnerToken: "Title"}) {
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
        updateStore (input: {uniqKey: "Title", title: "Title"}) {
          id
          userId
          partner
          partnerId
          partnerPlan
          title
          url
          partnerSpecificUrl
          partnerCreatedAt
          partnerUpdatedAt
          partnerToken
          uniqKey
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
// const cases = [listStoresCase, createStoreCase];

describe('Schema', () => {


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


  cases.forEach(obj => {
    const { id, query, variables, context: ctx, expected } = obj;

    test(`Testing Query: ${id}`, async () => {
      return await expect(
        graphql(mockSchema, query, null, { ctx }, variables)
      ).resolves.toEqual(expected);
    });
  });

});
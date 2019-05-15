const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const requireGraphQLFile = require('require-graphql-file');

const graphql = require('graphql').graphql;
const faker = require('faker');
const resolvers = require("../../modules/resolvers")
// const typeDefs = require('../../schema/graphql');
const typeDefs = requireGraphQLFile('../../schema/schema');

// -------------------------- createStoreTestCase --------------------------

const partner = 'shopify';
const createShop = {
  id: process.env.SHOPIFY_TEST_STORE_ID,
  partner: partner,
  plan_name: faker.lorem.word(),
  name: faker.company.companyName(),
  domain: faker.internet.domainName(),
  myshopify_domain: faker.internet.domainName(),
  created_at: faker.date.past().toString(),
  updated_at: faker.date.past().toString(),
  iana_timezone: "America/New_York",
  money_format: "$",
  money_with_currency_format: "$ USD",
  chanrge_id: faker.random.number({ min: 10000000 }),
}
const userName = faker.internet.email();
const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;
const storeKey = `${partner}-${process.env.SHOPIFY_TEST_STORE_ID}`;

const shopCreateStoreParams = {
  userId: userName,
  partner: createShop.partner,
  partnerId: createShop.id.toString(),
  partnerPlan: createShop.plan_name,
  title: createShop.name,
  storeUrl: createShop.domain,
  partnerSpecificUrl: createShop.myshopify_domain,
  partnerCreatedAt: createShop.created_at,
  partnerUpdatedAt: createShop.updated_at,
  partnerToken: accessToken,
  timezone: createShop.iana_timezone,
  moneyFormat: createShop.money_format,
  moneyWithCurrencyFormat: createShop.money_with_currency_format,
  numberOfProducts: 0,
  noOfActiveProducts: 0,
  numberOfScheduledPosts: 0,
  numberOfPosted: 0,
  productsLastUpdated: new Date().toISOString(),
  isCharged: false,
  chargedMethod: createShop.partner,
  chargeId: createShop.chanrge_id.toString(),
  chargeDate: new Date().toISOString(),
  isUninstalled: false,
};

const shopCreateStoreExpected = { id: storeKey, ...shopCreateStoreParams };
const shopCreateStoreParamsJson = JSON.stringify(shopCreateStoreParams).replace(/\"([^(\")"]+)\":/g, "$1:")

const createStoreTestCase = {
  id: 'Create new store',
  query: `
     mutation {
      createStore(input: ${shopCreateStoreParamsJson})
      {
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
  expected: { data: { createStore: shopCreateStoreExpected } }
};

// -------------------------- getStoreAfterCreateTestCase --------------------------
const getStoreAfterCreateTestCase = {
  id: 'Query: Get newly created Store',
  query: `
     query {
      getStore(id: "${storeKey}")
      {
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
  expected: { data: { getStore: shopCreateStoreExpected } }
};


// -------------------------- updateStoreTestCase --------------------------
const updateShop = {
  id: process.env.SHOPIFY_TEST_STORE_ID,
  partner: partner,
  plan_name: faker.lorem.word(),
  name: faker.company.companyName(),
  domain: faker.internet.domainName(),
  myshopify_domain: faker.internet.domainName(),
  updated_at: faker.date.past().toString(),
}

const shopUpdateStoreParams = {
  id: storeKey,
  partnerPlan: updateShop.plan_name,
  title: updateShop.name,
  storeUrl: updateShop.domain,
  partnerSpecificUrl: updateShop.myshopify_domain,
  partnerUpdatedAt: updateShop.updated_at,
  partnerToken: accessToken,
  timezone: createShop.iana_timezone,
  numberOfProducts: faker.random.number({ min: 10 }),
  noOfActiveProducts: faker.random.number({ min: 10 }),
  numberOfScheduledPosts: faker.random.number({ min: 10 }),
  numberOfPosted: faker.random.number({ min: 10 }),
  productsLastUpdated: new Date().toISOString(),
  isCharged: true,
  chargedMethod: createShop.partner,
  chargeId: createShop.chanrge_id.toString(),
  chargeDate: new Date().toISOString(),
  isUninstalled: true,
};

const shopUpdateStoreExpected = {
  userId: userName,
  partner: partner,
  partnerId: process.env.SHOPIFY_TEST_STORE_ID,
  moneyFormat: createShop.money_format,
  moneyWithCurrencyFormat: createShop.money_with_currency_format,
  partnerCreatedAt: createShop.created_at,
  ...shopUpdateStoreParams
};
const shopUpdateStoreParamsJson = JSON.stringify(shopUpdateStoreParams).replace(/\"([^(\")"]+)\":/g, "$1:")

const updateStoreTestCase = {
  id: 'Update Store',
  query: `
     mutation {
      updateStore(input: ${shopUpdateStoreParamsJson})
      {
        userId
        partner
        partnerId
        moneyFormat
        moneyWithCurrencyFormat
        partnerCreatedAt
        id
        partnerPlan
        title
        storeUrl
        partnerSpecificUrl
        partnerUpdatedAt
        partnerToken
        timezone        
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
  expected: { data: { updateStore: shopUpdateStoreExpected } }
};

// -------------------------- getStoreTestCase --------------------------
const getStoreAfterUpdateTestCase = {
  id: 'Get Store',
  query: `
     query {
      getStore(id: "${storeKey}")
      {
        userId
        partner
        partnerId
        moneyFormat
        moneyWithCurrencyFormat
        partnerCreatedAt
        id
        partnerPlan
        title
        storeUrl
        partnerSpecificUrl
        partnerUpdatedAt
        partnerToken
        timezone
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
  expected: { data: { getStore: shopUpdateStoreExpected } }
};

describe('Store Model', () => {
  const cases = [createStoreTestCase, getStoreAfterCreateTestCase, updateStoreTestCase, getStoreAfterUpdateTestCase]
  const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })
  cases.forEach(obj => {
    const { id, query, variables, context, expected } = obj
    test(`${id}`, async () => {
      const result = await graphql(schema, query, null, context, variables)
      return expect(result).toEqual(expected)
    })
  })
})


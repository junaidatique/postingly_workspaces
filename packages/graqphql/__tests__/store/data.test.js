const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const graphql = require('graphql').graphql;
const faker = require('faker');
const resolvers = require("../../modules/resolvers")
const typeDefs = require('../../schema/graphql');

const partner = 'shopify';
shop = {
  id: faker.random.number({ min: 10000000 }),
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
const accessToken = faker.random.uuid();

const storeKey = `${partner}-${shop.id}`;

const shopCreateStoreParams = {
  userId: userName,
  partner: shop.partner,
  partnerId: shop.id.toString(),
  partnerPlan: shop.plan_name,
  title: shop.name,
  storeUrl: shop.domain,
  partnerSpecificUrl: shop.myshopify_domain,
  partnerCreatedAt: shop.created_at,
  partnerUpdatedAt: shop.updated_at,
  partnerToken: accessToken,
  timezone: shop.iana_timezone,
  moneyFormat: shop.money_format,
  moneyWithCurrencyFormat: shop.money_with_currency_format,
  numberOfProducts: 0,
  noOfActiveProducts: 0,
  numberOfScheduledPosts: 0,
  numberOfPosted: 0,
  productsLastUpdated: new Date().toISOString(),
  isCharged: false,
  chargedMethod: shop.partner,
  chargeId: shop.chanrge_id.toString(),
  chargeDate: new Date().toISOString(),
  isUninstalled: false,
};

console.log('shopCreateStoreParams', shopCreateStoreParams);

const shopCreateStoreExpected = { id: storeKey, ...shopCreateStoreParams };
const shopCreateStoreParamsJson = JSON.stringify(shopCreateStoreParams).replace(/\"([^(\")"]+)\":/g, "$1:")

const createStoreTestCase = {
  id: 'Create Store',
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
const getStoreTestCase = {
  id: 'Get Store',
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



describe('Valid Test Cases', () => {

  const cases = [createStoreTestCase, getStoreTestCase]
  const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })

  cases.forEach(obj => {
    const { id, query, variables, context, expected } = obj

    test(`query: ${id}`, async () => {
      const result = await graphql(schema, query, null, context, variables)
      console.log("result", result);
      console.log("expected", expected);
      return expect(result).toEqual(expected)
    })
  })
})

describe('Test Cases that throw exception', () => {

  const cases = [createStoreTestCase, getStoreTestCase]
  const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })

  cases.forEach(obj => {
    const { id, query, variables, context, expected } = obj

    test(`query: ${id}`, async () => {
      const result = await graphql(schema, query, null, context, variables)
      console.log("result", result);
      console.log("expected", expected);
      return expect(result).toEqual(expected)
    })
  })
})
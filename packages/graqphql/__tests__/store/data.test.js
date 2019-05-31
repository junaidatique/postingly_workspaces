const graphql = require('graphql').graphql;
const faker = require('faker');
const mongoose = require('mongoose');
const schema = require('../executableSchema').schema;



describe('Store Model', () => {
  beforeAll(async (done) => {
    if (mongoose.connection.readyState === 2) {
      mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true }, async function () {
        for (let i in mongoose.connection.collections) {
          const res = await mongoose.connection.collections[i].deleteMany({ _id: { $exists: true } });
        }
      })
    }
    done();
  });

  const partner = 'shopify';
  const partnerStoreId = faker.random.number({ min: 10000000 });
  const userName = faker.internet.email();
  const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;
  const storeKey = `${partner}-${partnerStoreId}`;

  const createShop = {
    id: partnerStoreId,
    partner: partner,
    plan_name: faker.lorem.word(),
    name: faker.company.companyName(),
    domain: faker.internet.domainName(),
    myshopify_domain: faker.internet.domainName(),
    created_at: new Date(),
    updated_at: new Date(),
    iana_timezone: "America/Los_Angeles",
    money_format: "$",
    money_with_currency_format: "$ USD",
    chanrge_id: faker.random.number({ min: 10000000 }),
  }

  const shopCreateStoreParams = {
    userId: userName,
    title: createShop.name,
    url: createShop.domain,
    partner: createShop.partner,
    partnerId: createShop.id.toString(),
    partnerPlan: createShop.plan_name,
    partnerSpecificUrl: createShop.myshopify_domain,
    partnerCreatedAt: createShop.created_at.toISOString(),
    partnerUpdatedAt: createShop.updated_at.toISOString(),
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

  const shopCreateStoreExpected = { ...shopCreateStoreParams, uniqKey: storeKey };

  // -------------------------- getStoreBeforeCreateTestCase --------------------------


  const getStoreBeforeCreateTestCase = {
    id: 'Get store before creation',
    query: `
     query {
      getStore(uniqKey: "${storeKey}")
      {
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
        uniqKey
      }
    }
    `,
    variables: {},
    context: {},
    expected: { data: { getStore: shopCreateStoreExpected } }
  };


  test(`${getStoreBeforeCreateTestCase.id}`, async () => {
    const result = await graphql(schema, getStoreBeforeCreateTestCase.query, null, getStoreBeforeCreateTestCase.context, getStoreBeforeCreateTestCase.variables);
    expect(result).toHaveProperty('errors');
    expect(result.data.getStore).toBeNull();
  }, 30000);

  // -------------------------- createStoreTestCase --------------------------

  const shopCreateStoreParamsJson = JSON.stringify(shopCreateStoreParams).replace(/\"([^(\")"]+)\":/g, "$1:")

  const createStoreTestCase = {
    id: 'Create new store',
    query: `
     mutation {
      createStore(input: ${shopCreateStoreParamsJson})
      {
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
        uniqKey
      }
    }
    `,
    variables: {},
    context: {},
    expected: { data: { createStore: shopCreateStoreExpected } }
  };

  test(`${createStoreTestCase.id}`, async () => {
    const result = await graphql(schema, createStoreTestCase.query, null, createStoreTestCase.context, createStoreTestCase.variables);
    expect(result).toEqual(createStoreTestCase.expected)
  }, 30000);


  // -------------------------- getStoreAfterCreateTestCase --------------------------
  const getStoreAfterCreateTestCase = {
    id: 'Get newly created Store',
    query: `
     query {
      getStore(uniqKey: "${storeKey}")
      {
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
        uniqKey
      }
    }
    `,
    variables: {},
    context: {},
    expected: { data: { getStore: shopCreateStoreExpected } }
  };


  test(`${getStoreAfterCreateTestCase.id}`, async () => {
    const result = await graphql(schema, getStoreAfterCreateTestCase.query, null, getStoreAfterCreateTestCase.context, getStoreAfterCreateTestCase.variables);
    expect(result.data.getStore.userId).toEqual(getStoreAfterCreateTestCase.expected.data.getStore.userId);
    expect(result.data.getStore.uniqKey).toEqual(storeKey);
  }, 30000);


  // -------------------------- createStoreAgainToTestUpdate --------------------------

  const createShopAgain = {
    id: partnerStoreId,
    partner: partner,
    plan_name: faker.lorem.word(),
    name: faker.company.companyName(),
    domain: faker.internet.domainName(),
    myshopify_domain: faker.internet.domainName(),
    created_at: new Date(),
    updated_at: new Date(),
    iana_timezone: "America/New_York",
    money_format: "$",
    money_with_currency_format: "$ USD",
    chanrge_id: faker.random.number({ min: 10000000 }),
  }

  const shopCreateAgainStoreParams = {
    userId: userName,
    title: createShopAgain.name,
    url: createShopAgain.domain,
    partner: createShopAgain.partner,
    partnerId: createShopAgain.id.toString(),
    partnerPlan: createShopAgain.plan_name,
    partnerSpecificUrl: createShopAgain.myshopify_domain,
    partnerCreatedAt: createShopAgain.created_at.toISOString(),
    partnerUpdatedAt: createShopAgain.updated_at.toISOString(),
    partnerToken: accessToken,
    timezone: createShopAgain.iana_timezone,
    moneyFormat: createShopAgain.money_format,
    moneyWithCurrencyFormat: createShopAgain.money_with_currency_format,
    numberOfProducts: 0,
    noOfActiveProducts: 0,
    numberOfScheduledPosts: 0,
    numberOfPosted: 0,
    productsLastUpdated: new Date().toISOString(),
    isCharged: false,
    chargedMethod: createShopAgain.partner,
    chargeId: createShopAgain.chanrge_id.toString(),
    chargeDate: new Date().toISOString(),
    isUninstalled: false,
  };

  const shopCreateAgainStoreExpected = { ...shopCreateAgainStoreParams, uniqKey: storeKey };
  const shopCreateAgainStoreParamsJson = JSON.stringify(shopCreateAgainStoreParams).replace(/\"([^(\")"]+)\":/g, "$1:")

  const createAgainStoreTestCase = {
    id: 'Create new store again with same id',
    query: `
     mutation {
      createStore(input: ${shopCreateAgainStoreParamsJson})
      {
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
        uniqKey
      }
    }
    `,
    variables: {},
    context: {},
    expected: { data: { createStore: shopCreateAgainStoreExpected } }
  };

  test(`${createAgainStoreTestCase.id}`, async () => {
    const result = await graphql(schema, createAgainStoreTestCase.query, null, createAgainStoreTestCase.context, createAgainStoreTestCase.variables);
    expect(result).toEqual(createAgainStoreTestCase.expected)
  }, 30000);

  // -------------------------- updateStoreTestCase --------------------------
  const updateShop = {
    id: partnerStoreId,
    partner: partner,
    plan_name: faker.lorem.word(),
    name: faker.company.companyName(),
    domain: faker.internet.domainName(),
    myshopify_domain: faker.internet.domainName(),
    updated_at: new Date().toISOString(),
  }

  const shopUpdateStoreParams = {
    uniqKey: storeKey,
    partnerPlan: updateShop.plan_name,
    title: createShopAgain.name,
    url: createShopAgain.domain,
    partnerSpecificUrl: createShopAgain.myshopify_domain,
    partnerUpdatedAt: updateShop.updated_at,
    partnerToken: accessToken,
    timezone: createShopAgain.iana_timezone,
    numberOfProducts: faker.random.number({ min: 10 }),
    noOfActiveProducts: faker.random.number({ min: 10 }),
    numberOfScheduledPosts: faker.random.number({ min: 10 }),
    numberOfPosted: faker.random.number({ min: 10 }),
    productsLastUpdated: new Date().toISOString(),
    isCharged: true,
    chargedMethod: createShopAgain.partner,
    chargeId: createShopAgain.chanrge_id.toString(),
    chargeDate: new Date().toISOString(),
    isUninstalled: false,
  };

  const shopUpdateStoreExpected = {
    userId: userName,
    partner: partner,
    partnerId: partnerStoreId.toString(),
    moneyFormat: createShopAgain.money_format,
    moneyWithCurrencyFormat: createShopAgain.money_with_currency_format,
    partnerCreatedAt: createShopAgain.created_at.toISOString(),
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
        title
        url
        partner
        partnerId
        moneyFormat
        moneyWithCurrencyFormat
        partnerCreatedAt
        partnerPlan
        partnerSpecificUrl
        partnerUpdatedAt
        partnerToken
        uniqKey
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

  test(`${updateStoreTestCase.id}`, async () => {
    const result = await graphql(schema, updateStoreTestCase.query, null, updateStoreTestCase.context, updateStoreTestCase.variables)
    expect(result).toEqual(updateStoreTestCase.expected);
  }, 30000)


  // -------------------------- getStoreTestCase --------------------------
  const getStoreAfterUpdateTestCase = {
    id: 'Get Store',
    query: `
     query {
      getStore(uniqKey: "${storeKey}")
      {
        userId
        partner
        partnerId
        moneyFormat
        moneyWithCurrencyFormat
        partnerCreatedAt
        partnerPlan
        title
        url
        partnerSpecificUrl
        partnerUpdatedAt
        partnerToken
        uniqKey
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

  test(`${getStoreAfterUpdateTestCase.id}`, async () => {
    const result = await graphql(schema, getStoreAfterUpdateTestCase.query, null, getStoreAfterUpdateTestCase.context, getStoreAfterUpdateTestCase.variables)
    expect(result).toEqual(getStoreAfterUpdateTestCase.expected)
  }, 30000);

  // -------------------------- listStoresWithoutFilterTestCase --------------------------

  const listStoresWithoutFilterTestCase = {
    id: 'List Stores Without Filter',
    query: `
     query {
        listStores {
          userId
          partner
          partnerId
          moneyFormat
          moneyWithCurrencyFormat
          partnerCreatedAt
          partnerPlan
          title
          url
          partnerSpecificUrl
          partnerUpdatedAt
          partnerToken
          uniqKey
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
    expected: { data: { listStores: [shopUpdateStoreExpected] } }
  };

  test(`${listStoresWithoutFilterTestCase.id}`, async () => {
    const result = await graphql(schema, listStoresWithoutFilterTestCase.query, null, listStoresWithoutFilterTestCase.context, listStoresWithoutFilterTestCase.variables)
    expect(result).toEqual(listStoresWithoutFilterTestCase.expected)
  }, 30000);
  // -------------------------- listStoresWithPartnerFilterTestCase --------------------------

  const listStoresWithPartnerFilterTestCase = {
    id: 'List Stores Partner Filter',
    query: `
     query {
        listStores(filter: {partner: {eq: "${partner}"} }) {
          userId
          partner
          partnerId
          moneyFormat
          moneyWithCurrencyFormat
          partnerCreatedAt
          partnerPlan
          title
          url
          partnerSpecificUrl
          partnerUpdatedAt
          partnerToken
          uniqKey
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
    expected: { data: { listStores: [shopUpdateStoreExpected] } }
  };

  test(`${listStoresWithPartnerFilterTestCase.id}`, async () => {
    const result = await graphql(schema, listStoresWithPartnerFilterTestCase.query, null, listStoresWithPartnerFilterTestCase.context, listStoresWithPartnerFilterTestCase.variables)
    expect(result).toEqual(listStoresWithPartnerFilterTestCase.expected)
  }, 30000);



})


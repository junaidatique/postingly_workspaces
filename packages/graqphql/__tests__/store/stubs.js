const faker = require('faker');
const StoreModel = require('shared').StoreModel;


const createStoreStub = async () => {
  const partner = 'shopify';
  const partnerStoreId = faker.random.number({ min: 10000000 });
  const userName = faker.internet.email();
  const accessToken = process.env.SHOPIFY_TEST_ACCESS_TOKEN;
  const storeKey = `${partner}-${partnerStoreId}`;

  const shopCreateStoreParams = {
    userId: userName,
    title: faker.company.companyName(),
    partnerToken: accessToken,
    partner: partner,
    partnerId: partnerStoreId,
    uniqKey: storeKey
  };

  const storeInstance = await StoreModel.create(shopCreateStoreParams);
  return storeInstance;
}

exports.createStoreStub = createStoreStub
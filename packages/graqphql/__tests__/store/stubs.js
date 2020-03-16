const faker = require('faker');
const StoreModel = require('shared').StoreModel;
const { LINK_SHORTENER_SERVICES_NONE, LINK_SHORTENER_SERVICES_POOOST } = require('shared/constants');

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
    uniqKey: storeKey,
    // timezone: "America/New_York",
    // timezone: "America/Thule",
    // timezone: "Europe/London",
    timezone: "Asia/Karachi",
    autoApproveUpdates: true,
    autoAddCaptionOfUpdates: true,
    shortLinkService: LINK_SHORTENER_SERVICES_POOOST,
  };

  const storeInstance = await StoreModel.create(shopCreateStoreParams);
  return storeInstance;
}

exports.createStoreStub = createStoreStub
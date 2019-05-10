const faker = require('faker');
const Store = require('shared').StoreModel;
const Profile = require('shared').ProfileModel;
module.exports = {
  createStore: async function (event, context) {
    shop = {
      id: faker.random.number({ min: 10000000 }),
      plan_name: faker.lorem.word(),
      name: faker.company.companyName(),
      domain: faker.internet.domainName(),
      myshopify_domain: faker.internet.domainName(),
      created_at: faker.date.past(),
      updated_at: faker.date.past(),
      timezone: "America/New_York",
      money_format: "$",
      money_with_currency_format: "$ USD",
    }
    storeKey = `shopify-${shop.id}`;
    userName = faker.internet.email();
    accessToken = faker.random.uuid();
    const shopParams = {
      id: storeKey,
      userId: userName,
      partner: 'shopify',
      partnerId: shop.id,
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
      isCharged: false,
      // chargedMethod: '',
      // chargeId: '',
      isUninstalled: false,
    };
    console.log("shopParams", shopParams);
    store = new Store(shopParams);
    store = await store.save();
    console.log("store", store);

    userResponse = {
      id: faker.random.number({ min: 10000000 }),
      name: faker.name.title(),
      picture: {
        data: {
          url: faker.image.avatar()
        }
      },
      serviceUserId: faker.random.number({ min: 10000000 }),
      serviceUsername: faker.name.title(),
      profileURL: faker.internet.url(),

    }
    const userParams = {
      id: `facebook_profile-${userResponse.id}`,
      name: userResponse.name,
      avatarUrl: userResponse.picture.data.url,
      serviceUserId: userResponse.id,
      // serviceUsername: userResponse.link,
      profileURL: userResponse.link,
      accessToken: accessToken,
      // accessTokenSecret: "",
      service: "facebook",
      serviceProfile: "facebook_profile",
      // bufferId: "",
      isConnected: true,
      isTokenExpired: false,
      isSharePossible: false,
      profileStoreId: storeKey
    };
    console.log("userparams", userParams);
    fb_profile = await Profile.create(userParams);
    console.log("fb_profile", fb_profile);

    for (i = 0; i < 4; i++) {
      pageProfile = {
        id: faker.random.number({ min: 10000000 }),
        name: faker.name.title(),
        picture: {
          data: {
            url: faker.image.avatar()
          }
        },
        serviceUserId: faker.random.number({ min: 10000000 }),
        serviceUsername: faker.name.title(),
        link: faker.internet.url(),
      }
      const pageParams = {
        id: `facebook_page-${pageProfile.id}`,
        name: pageProfile.name,
        avatarUrl: pageProfile.picture.data.url,
        serviceUserId: pageProfile.id,
        // serviceUsername: userResponse.link,
        profileURL: pageProfile.link,
        accessToken: accessToken,
        // accessTokenSecret: "",
        service: "facebook",
        serviceProfile: "facebook_page",
        // bufferId: "",
        isConnected: true,
        isTokenExpired: false,
        isSharePossible: true,
        storeId: storeKey,
        parentProfile: userResponse.id
      };
      console.log("pageParams", pageParams);
      fb_page = await Profile.create(pageParams);
    }

    // profile = await query.putItem(process.env.PROFILE_TABLE, pageParams);
  },
  testData: async function (event, context) {
    console.log(event);
    const p = await Profile.get({ id: event }, { attributes: ['id', 'storeId', 'profileURL', 'avatarUrl'] });
    console.log(p);
  }
}
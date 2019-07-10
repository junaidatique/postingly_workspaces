const faker = require('faker');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;
const { FACEBOOK_SERVICE, FACEBOOK_PROFILE, FACEBOOK_PAGE } = require('shared/constants')

const createFBPageProfileStub = async (storeId, isConnected, numberOfProfiles) => {
  let storeDetail = await StoreModel.findById(storeId);
  // console.log('storedetail in profile model stub', storeDetail);
  let serviceUserId = faker.random.number({ min: 10000000 });
  let uniqKey = `${FACEBOOK_PROFILE}-${serviceUserId}`;
  const parentParams = {
    store: storeId,
    name: faker.company.companyName(),
    uniqKey: uniqKey,
    avatarUrl: faker.image.avatar(),
    serviceUserId: serviceUserId,
    serviceUsername: faker.company.companyName(),
    profileURL: faker.internet.url(),
    accessToken: faker.random.uuid(),
    service: FACEBOOK_SERVICE,
    serviceProfile: FACEBOOK_PROFILE,
    isConnected: false,
    isTokenExpired: false,
    isSharePossible: false
  }
  const parentInstance = await ProfileModel.create(parentParams);
  // console.log('storeDetail.profiles', storeDetail.profiles);
  await storeDetail.profiles.push(parentInstance);
  await storeDetail.save();
  storeDetail = await StoreModel.findById(storeId);
  let childParams = {}
  let child;
  for (let i = 1; i <= numberOfProfiles; i++) {
    serviceUserId = faker.random.number({ min: 10000000 });
    uniqKey = `${FACEBOOK_PAGE}-${serviceUserId}`;
    childParams = {
      store: storeId,
      parent: parentInstance._id,
      name: faker.company.companyName(),
      uniqKey: uniqKey,
      avatarUrl: faker.image.avatar(),
      serviceUserId: serviceUserId,
      serviceUsername: faker.company.companyName(),
      profileURL: faker.internet.url(),
      accessToken: faker.random.uuid(),
      service: FACEBOOK_SERVICE,
      serviceProfile: FACEBOOK_PAGE,
      isConnected: isConnected,
      isTokenExpired: false,
      isSharePossible: true
    };

    child = await ProfileModel.create(childParams);
    await storeDetail.profiles.push(child);
    await parentInstance.children.push(child);
  }
  // console.log('storeDetail modifiedPaths', storeDetail.modifiedPaths());
  await storeDetail.save();
  await parentInstance.save();
  return parentInstance.children;
}

exports.createFBPageProfileStub = createFBPageProfileStub
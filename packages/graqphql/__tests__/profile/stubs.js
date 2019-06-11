const faker = require('faker');
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;


const createFBPageProfileStub = async (storeId, isConnected, numberOfProfiles) => {
  let storeDetail = await StoreModel.findById(storeId);
  // console.log('storedetail in profile model stub', storeDetail);
  let serviceUserId = faker.random.number({ min: 10000000 });
  let uniqKey = `facebookProfile-${serviceUserId}`;
  const parentParams = {
    store: storeId,
    name: faker.company.companyName(),
    uniqKey: uniqKey,
    avatarUrl: faker.image.avatar(),
    serviceUserId: serviceUserId,
    serviceUsername: faker.company.companyName(),
    profileURL: faker.internet.url(),
    accessToken: faker.random.uuid(),
    service: 'Faceboook',
    serviceProfile: 'facebookProfile',
    isConnected: false,
    isTokenExpired: false,
    isSharePossible: false
  }
  const parentInstance = await ProfileModel.create(parentParams);
  await storeDetail.profiles.push(parentInstance);
  await storeDetail.save();
  const storeDetailUpdated = await StoreModel.findById(storeId);
  let childParams = {}
  let child;
  for (let i = 1; i <= numberOfProfiles; i++) {
    serviceUserId = faker.random.number({ min: 10000000 });
    uniqKey = `facebookPage-${serviceUserId}`;
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
      service: 'Facebook',
      serviceProfile: 'facebookPage',
      isConnected: isConnected,
      isTokenExpired: false,
      isSharePossible: true
    };

    child = await ProfileModel.create(childParams);
    await storeDetailUpdated.profiles.push(child);
    await parentInstance.children.push(child);
  }
  await storeDetailUpdated.save();
  await parentInstance.save();
  return parentInstance.children;
}

exports.createFBPageProfileStub = createFBPageProfileStub
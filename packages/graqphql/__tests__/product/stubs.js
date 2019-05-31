const faker = require('faker');
const StoreModel = require('shared').StoreModel;
const ProductModel = require('shared').ProductModel;
const VariantModel = require('shared').VariantModel;
const CollectionModel = require('shared').CollectionModel;

const createProductStub = async (storeId) => {
  try {
    const storeDetail = await StoreModel.findById(storeId);

    let productParams, title, partnerId, uniqKey, quantity, minimumPrice,
      maximumPrice, postableByQuantity, postableByPrice, postableIsNew, postableBySale,
      product, images
      ;
    for (let i = 0; i <= 10; i++) {
      title = faker.commerce.productName();
      partnerId = faker.random.number({ min: 10000000 });

      uniqKey = `${storeDetail.partner}-${partnerId}`
      quantity = faker.random.number({ min: 0, max: 10 });
      minimumPrice = faker.random.number({ min: 2, max: 10 });
      maximumPrice = minimumPrice + faker.random.number({ min: 2, max: 5 });
      postableByQuantity = (quantity > 0) ? true : false;
      postableByPrice = (minimumPrice > 0) ? true : false;
      postableIsNew = false;
      postableBySale = false;
      images = await createImageStub(storeDetail.partner);
      productParams = {
        store: storeId,
        title: title,
        url: {
          service: 'Pooo.st',
          url: `https://pooo.st/${faker.helpers.slugify(title)}`
        },
        description: faker.lorem.sentences(5),
        partner: storeDetail.partner,
        partnerId: partnerId,
        partnerSpecificUrl: faker.internet.url(),
        partnerCreatedAt: faker.date.past().toISOString(),
        uniqKey: uniqKey,
        quantity: quantity,
        minimumPrice: minimumPrice,
        maximumPrice: maximumPrice,
        postableByPrice,
        postableByQuantity,
        postableBySale,
        postableIsNew,
        images: images
      };
      product = await ProductModel.create(productParams);
    }
  } catch (error) {
    console.error(error.message);
  }
}

const createImageStub = async (partner) => {
  let images = [], partnerId;
  for (let i = 1; i <= 5; i++) {
    partnerId = faker.random.number({ min: 10000000 });
    uniqKey = `${partner}-${partnerId}`
    images.push({
      partnerId: partnerId,
      partnerSpecificUrl: faker.image.imageUrl(),
      thumbnailUrl: faker.image.imageUrl(100, 100),
      partnerCreatedAt: faker.date.past().toISOString(),
      imgUniqKey: uniqKey,
      position: i,

    });
  }
  return images;
}

exports.createProductStub = createProductStub;
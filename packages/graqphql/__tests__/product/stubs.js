const faker = require('faker');
const StoreModel = require('shared').StoreModel;
const ProductModel = require('shared').ProductModel;
const VariantModel = require('shared').VariantModel;
const CollectionModel = require('shared').CollectionModel;
const ImageModel = require('shared').ImageModel;

const createCollectionStub = async (storeId, numberOfCollections) => {
  try {
    const storeDetail = await StoreModel.findById(storeId);
    let collectionParams, uniqKey, title, partnerId;
    for (let i = 1; i <= numberOfCollections; i++) {
      title = faker.commerce.productName();
      partnerId = faker.random.number({ min: 10000000 });
      uniqKey = `${storeDetail.partner}-${partnerId}`;
      collectionParams = {
        partner: storeDetail.partner,
        partnerId: partnerId,
        store: storeId,
        title: title,
        partnerCreatedAt: faker.date.past().toISOString(),
        uniqKey: uniqKey,
      };
      collection = await CollectionModel.create(collectionParams);
      r = await storeDetail.collections.push(collection);
    }
    await storeDetail.save();
    return storeDetail.collections;
  } catch (error) {
    console.error(error.message);
  }

}
const createProductStub = async (storeId, numberOfProducts, collectionId, zeroQuantity = false) => {
  try {
    const storeDetail = await StoreModel.findById(storeId);
    let productParams, title, partnerId, uniqKey, quantity, minimumPrice,
      maximumPrice, postableByQuantity, postableByPrice, postableIsNew, postableBySale,
      product, images, productIds = [];

    const collectionDetail = await CollectionModel.findById(collectionId);

    for (let i = 1; i <= numberOfProducts; i++) {
      title = faker.commerce.productName();
      partnerId = faker.random.number({ min: 10000000 });
      uniqKey = `${storeDetail.partner}-${partnerId}`;
      quantity = (zeroQuantity) ? 0 : faker.random.number({ min: 1, max: 10 });
      minimumPrice = faker.random.number({ min: 2, max: 10 });
      maximumPrice = minimumPrice + faker.random.number({ min: 2, max: 5 });
      postableByQuantity = (quantity > 0) ? true : false;
      postableByPrice = (minimumPrice > 0) ? true : false;
      postableIsNew = false;
      postableBySale = false;
      postableByImage = true;
      // 
      productParams = {
        store: storeId,
        title: title,
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
        postableByImage,
        collections: [
          collectionId
        ]
      };
      product = await ProductModel.create(productParams);
      images = await createImageStub(storeDetail.partner, 'product', product._id);
      await Promise.all(images.map(async image => {
        await product.images.push(image._id);
      }));

      await storeDetail.products.push(product);
      await collectionDetail.products.push(product);
      await storeDetail.save();
      await collectionDetail.save();

      // variant
      for (let j = 1; j <= 5; j++) {
        title = faker.commerce.productName();
        const random = faker.random.number({ min: 10000000 });
        partnerId = faker.random.number({ min: random });
        uniqKey = `${storeDetail.partner}-${partnerId}`
        quantity = faker.random.number({ min: 0, max: 10 });
        postableByQuantity = (quantity > 0) ? true : false;
        postableByPrice = (minimumPrice > 0) ? true : false;
        variantParams = {
          store: storeId,
          product: product._id,
          title: title,
          partner: storeDetail.partner,
          partnerId: partnerId,
          partnerCreatedAt: faker.date.past().toISOString(),
          uniqKey: uniqKey,
          quantity: quantity,
          price: minimumPrice,
          postableByPrice,
          postableByQuantity,
          postableBySale,
          postableIsNew,
          postableByImage,
          images: images,
          collections: [
            collectionId
          ]
        };
        variant = await VariantModel.create(variantParams);
        images = await createImageStub(storeDetail.partner, 'variant', variant._id);
        await Promise.all(images.map(async image => {
          await variant.images.push(image._id);
        }));
        t = await product.variants.push(variant);
        await product.save();
      }
    }


  } catch (error) {
    console.error(error.message);
  }
}

const createImageStub = async (partner, ref, reference_id) => {
  let images = [], partnerId, image, imageParams;
  for (let i = 1; i <= 5; i++) {
    const partnerId = faker.random.number({ min: 10000000 });
    const uniqKey = `${ref}-${partner}-${partnerId}`;
    imageParams = {
      partnerId: partnerId,
      partnerSpecificUrl: faker.image.imageUrl(faker.random.number({ min: 10 * i, max: 10 * (i + 1) }), faker.random.number({ min: 10 * i, max: 10 * (i + 1) })),
      thumbnailUrl: faker.image.imageUrl(100, 100),
      partnerCreatedAt: faker.date.past().toISOString(),
      imgUniqKey: uniqKey,
      position: i,
    };
    if (ref === 'product') {
      imageParams['product'] = reference_id;
    } else {
      imageParams['variant'] = reference_id;
    }
    image = await ImageModel.create(imageParams);
    images.push(image);
  }
  return images;
}

exports.createProductStub = createProductStub;
exports.createCollectionStub = createCollectionStub;
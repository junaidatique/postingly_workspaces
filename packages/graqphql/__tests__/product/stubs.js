const faker = require('faker');
const StoreModel = require('shared').StoreModel;
const ProductModel = require('shared').ProductModel;
const VariantModel = require('shared').VariantModel;
const CollectionModel = require('shared').CollectionModel;
const ImageModel = require('shared').ImageModel;
const stringHelper = require('shared').stringHelper;
const {
  FACEBOOK_DEFAULT_TEXT,

} = require('shared/constants');
const createCollectionStub = async (storeId, numberOfCollections) => {
  try {
    const storeDetail = await StoreModel.findById(storeId);
    let collectionParams, uniqKey, title, partnerId;
    for (let i = 1; i <= numberOfCollections; i++) {
      title = faker.commerce.productName();
      partnerId = faker.random.number({ min: 10000000 });
      uniqKey = `${storeDetail.partner}-${partnerId}`;
      collectionParams = {
        title: title,
        partnerId: partnerId,
        partnerCreatedAt: faker.date.past().toISOString(),
        partnerUpdatedAt: faker.date.past().toISOString(),
        partner: storeDetail.partner,
        uniqKey: uniqKey,
        description: faker.lorem.sentences(3),
        active: ((Math.floor(Math.random() * 10) + 1) > 3) ? true : false,
        store: storeId,
      };
      collection = await CollectionModel.create(collectionParams);
    }
    const storeCollections = await CollectionModel.find({ store: storeDetail._id })
    return storeCollections;
  } catch (error) {
    console.error(error.message);
  }

}
const createProductStub = async (storeId, numberOfProducts, collectionIds) => {
  try {
    const storeDetail = await StoreModel.findById(storeId);
    let productParams, title, partnerId, uniqKey, quantity, minimumPrice,
      maximumPrice, postableByQuantity, postableByPrice, postableIsNew, postableBySale,
      product, images, productIds = [], description;

    const collectionDetails = await CollectionModel.where('_id').in(collectionIds);

    for (let i = 1; i <= numberOfProducts; i++) {
      title = faker.commerce.productName();
      partnerId = faker.random.number({ min: 10000000 });
      uniqKey = `${storeDetail.partner}-${partnerId}`;
      quantity = faker.random.number({ min: 0, max: 10 });
      minimumPrice = faker.random.number({ min: 2, max: 10 });
      maximumPrice = minimumPrice + faker.random.number({ min: 2, max: 5 });
      postableByQuantity = (quantity > 0) ? true : false;
      postableByPrice = (minimumPrice > 0) ? true : false;
      postableIsNew = false;
      postableBySale = false;
      postableByImage = ((Math.floor(Math.random() * 10) + 1) > 2) ? true : false;
      description = faker.lorem.sentences(5);
      partnerSpecificUrl = faker.internet.url();
      productParams = {
        title: title,
        description: description,
        suggestedText: stringHelper.formatCaptionText(FACEBOOK_DEFAULT_TEXT, title, partnerSpecificUrl, minimumPrice, description),
        partnerSpecificUrl: partnerSpecificUrl,
        partner: storeDetail.partner,
        partnerId: partnerId,
        partnerCreatedAt: faker.date.past().toISOString(),
        partnerUpdatedAt: faker.date.past().toISOString(),
        uniqKey: uniqKey,
        active: ((Math.floor(Math.random() * 10) + 1) > 3) ? true : false,
        store: storeId,
        quantity: quantity,
        minimumPrice: minimumPrice,
        maximumPrice: maximumPrice,
        onSale: false,
        postableByImage,
        postableByQuantity,
        postableByPrice,
        postableBySale,
        postableIsNew,
        collections: collectionIds,
      };
      product = await ProductModel.create(productParams);
      if (postableByImage) {
        images = await createImageStub(storeDetail.partner, 'product', product._id);
        await Promise.all(images.map(async image => {
          await product.images.push(image._id);
        }));
      }

      const bulkCollectionUpdate = collectionDetails.map(collection => {
        let products = collection.products;
        products.push(product._id);
        return {
          updateOne: {
            filter: { _id: collection._id },
            update: {
              products: products
            }
          }
        }
      });
      await CollectionModel.bulkWrite(bulkCollectionUpdate);

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
          title: title,
          price: minimumPrice,
          uniqKey: uniqKey,
          partner: storeDetail.partner,
          partnerId: partnerId,
          partnerCreatedAt: faker.date.past().toISOString(),
          partnerUpdatedAt: faker.date.past().toISOString(),
          position: j,
          quantity: quantity,
          store: storeId,
          product: product._id,
          suggestedText: stringHelper.formatCaptionText(FACEBOOK_DEFAULT_TEXT, title, partnerSpecificUrl, minimumPrice, stringHelper.stripTags(description)),
          postableByPrice,
          postableByQuantity,
          postableBySale,
          postableIsNew,
          postableByImage,
          images: images,
          collections: collectionIds
        };
        variant = await VariantModel.create(variantParams);
        if ((Math.floor(Math.random() * 10) + 1) > 2) {
          images = await createImageStub(storeDetail.partner, 'variant', variant._id);
          await Promise.all(images.map(async image => {
            await variant.images.push(image._id);
          }));
        }

        const bulkCollectionUpdate = collectionDetails.map(collection => {
          let variants = collection.variants;
          variants.push(variant._id);
          return {
            updateOne: {
              filter: { _id: collection._id },
              update: {
                variants: variants
              }
            }
          }
        });
        await CollectionModel.bulkWrite(bulkCollectionUpdate);
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
    const partnerId = `${faker.random.number({ min: 10000000 })}${faker.random.number({ min: 10000000 })}`;
    const uniqKey = `${ref}-${partner}-${partnerId}`;
    imageParams = {
      partnerId: partnerId,
      partnerSpecificUrl: faker.image.imageUrl(faker.random.number({ min: 100 * i, max: 100 * (i + 1) }), faker.random.number({ min: 100 * i, max: 100 * (i + 1) })),
      // partnerSpecificUrl: `https://picsum.photos/seed/picsum/${faker.random.number({ min: 100 * i, max: 100 * (i + 1) })}/${faker.random.number({ min: 100 * i, max: 100 * (i + 1) })}`,
      // thumbnailUrl: `https://picsum.photos/seed/picsum/100/100`,
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
    // console.log("TCL: createImageStub -> imageParams", imageParams)
    image = await ImageModel.create(imageParams);
    images.push(image);
  }
  return images;
}

exports.createProductStub = createProductStub;
exports.createCollectionStub = createCollectionStub;
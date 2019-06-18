const shared = require('shared');
const fetch = require('node-fetch');
const _ = require('lodash');
const moment = require('moment');
const { PARTNERS_SHOPIFY } = require('shared/constants');

module.exports = {
  syncStoreData: async function (event) {
    console.log('syncStoreData event', event);
    const ProductModel = shared.ProductModel;
    if (process.env.IS_OFFLINE) {
      const dbCollectionsUpdate = await ProductModel.updateMany({ store: event.storeId }, { collections: [] });
      await this.syncCollections({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY });
      await this.syncProducts({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: null });
    }
  },
  syncCollections: async function (event) {
    console.log('syncCollections event', event);
    const StoreModel = shared.StoreModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/custom_collections/count.json`;
    console.log('syncCollections url', url);
    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const customCollectionsCount = json.count;
    const totalCustomCollections = Math.ceil(customCollectionsCount / 250);
    for (let page = 1; page <= totalCustomCollections; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncCollectionPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionType: 'custom_collections' })
      }
    }
    url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/smart_collections/count.json`;
    res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    json = await res.json();
    const smartCollectionsCount = json.count;
    const totalSmartCollections = Math.ceil(smartCollectionsCount / 250);
    for (let page = 1; page <= totalSmartCollections; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncCollectionPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionType: 'smart_collections' })
      }
    }
  },
  syncCollectionPage: async function (event) {
    console.log('syncCollectionPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    const url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/${event.collectionType}.json?limit=250&page=${event.page}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    const json = await res.json();
    let collectionUniqKeys = [];
    const bulkCollectionInsert = json[event.collectionType].map(collection => {
      collectionUniqKeys.push(`${PARTNERS_SHOPIFY}-${collection.id}`);
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}` },
          update: {
            title: collection.title,
            partnerId: collection.id,
            partnerName: collection.title,
            partneCreatedAt: collection.published_at,
            partnerUpdatedAt: collection.updated_at,
            partner: PARTNERS_SHOPIFY,
            uniqKey: `${PARTNERS_SHOPIFY}-${collection.id}`,
            description: collection.body_html,
            active: (collection.published_at.blank) ? true : false,
            store: event.storeId,
          },
          upsert: true
        }
      }
    });
    const r = await CollectionModel.bulkWrite(bulkCollectionInsert);
    const dbCollections = await CollectionModel.where('uniqKey').in(collectionUniqKeys.map(collection => collection)).select('_id');
    await Promise.all(dbCollections.map(async collection => {
      if (process.env.IS_OFFLINE) {
        await this.syncProducts({ storeId: event.storeId, partnerStore: PARTNERS_SHOPIFY, collectionId: collection._id })
      }
    }));

  },
  syncProducts: async function (event) {
    console.log('syncProducts event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url;
    if (!_.isNull(event.collectionId)) {
      const collectionDetail = await CollectionModel.findById(event.collectionId);
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json?collection_id=${collectionDetail.partnerId}`;
    } else {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products/count.json`;
    }
    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const productCount = json.count;
    const totalProducts = Math.ceil(productCount / 250);
    for (let page = 1; page <= totalProducts; page++) {
      if (process.env.IS_OFFLINE) {
        await this.syncProductPage({ storeId: event.storeId, partnerStore: storeDetail.partner, page: page, collectionId: event.collectionId })
      }
    }
  },
  syncProductPage: async function (event) {
    console.log('syncProductPage event', event);
    const StoreModel = shared.StoreModel;
    const CollectionModel = shared.CollectionModel;
    const ProductModel = shared.ProductModel;
    const ImageModel = shared.ImageModel;
    const VariantModel = shared.VariantModel;
    const storeDetail = await StoreModel.findById(event.storeId);
    let url;
    if (!_.isNull(event.collectionId)) {
      const collectionDetail = await CollectionModel.findById(event.collectionId);
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?collection_id=${collectionDetail.partnerId}&limit=250&page=${event.page}`;
    } else {
      url = `https://${storeDetail.partnerSpecificUrl}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json?limit=250&page=${event.page}`;
    }

    let res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storeDetail.partnerToken,
      },
      method: "GET",
    });
    let json = await res.json();
    const apiProducts = json.products;
    let productImages = [], productVariants = [], variantImages = [];
    // sync products
    const bulkProductInsert = apiProducts.map(product => {
      const quantity = product.variants.map(variant => variant.inventory_quantity).reduce((prev, curr) => prev + curr, 0);
      const minimumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p < v && p > 0) ? p : v));
      const maximumPrice = product.variants.map(variant => (variant.price)).reduce((p, v) => ((p > v) ? p : v));
      const onSale = product.variants.map(variant => (variant.compare_at_price != variant.price) ? true : false).includes(true);
      return {
        updateOne: {
          filter: { uniqKey: `${PARTNERS_SHOPIFY}-${product.id}` },
          update: {
            title: product.title,
            description: product.body_html,
            partnerSpecificUrl: `://${storeDetail.url}/${product.handle}`,
            partner: PARTNERS_SHOPIFY,
            partnerId: product.id,
            partnerName: product.title,
            partnerCreatedAt: product.created_at,
            partnerUpdatedAt: product.updated_at,
            uniqKey: `${PARTNERS_SHOPIFY}-${product.id}`,
            active: (product.published_at) ? true : false,
            store: event.storeId,
            quantity: quantity,
            minimumPrice: minimumPrice,
            maximumPrice: maximumPrice,
            onSale: onSale,
            postableByImage: (product.images.length > 0) ? true : false,
            postableByQuantity: (quantity > 0) ? true : false,
            postableByPrice: (minimumPrice > 0) ? true : false,
            postableIsNew: (moment(product.created_at).isAfter(moment().subtract(7, 'days'))) ? true : false,
            postableBySale: onSale
          },
          upsert: true
        }
      }
    });
    const products = await ProductModel.bulkWrite(bulkProductInsert);
    const dbProducts = await ProductModel.where('uniqKey').in(apiProducts.map(product => `${PARTNERS_SHOPIFY}-${product.id}`)).select('_id uniqKey postableByImage collections');
    if (!_.isNull(event.collectionId)) {
      const bulkCollectionUpdate = dbProducts.map(product => {
        let collections = product.collections;
        collections.push(event.collectionId);
        return {
          updateOne: {
            filter: { _id: product._id },
            update: {
              collections: collections
            }
          }
        }
      })
      const collections = await ProductModel.bulkWrite(bulkCollectionUpdate);
    } else {

      // set active to false so that deleted images and variants are eliminated. 
      const dbImagesUpdate = await ImageModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });
      const dbVariantsUpdate = await VariantModel.updateMany({ product: { $in: dbProducts.map(product => product._id) } }, { active: false });

      // sync images for the products.
      const bulkImageInsert = apiProducts.map(product => {
        const productId = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`)._id;
        return product.images.map(productImage => {
          const thumbnailUrl = `${productImage.src.slice(0, productImage.src.lastIndexOf('.'))}_small.${productImage.src.slice(productImage.src.lastIndexOf('.') + 1)}`;
          return {
            updateOne: {
              filter: { imgUniqKey: `product-${PARTNERS_SHOPIFY}-${productImage.id}` },
              update: {
                partnerSpecificUrl: productImage.src,
                partnerId: productImage.id,
                partneCreatedAt: productImage.published_at,
                partnerUpdatedAt: productImage.updated_at,
                partner: PARTNERS_SHOPIFY,
                imgUniqKey: `product-${PARTNERS_SHOPIFY}-${productImage.id}`,
                position: productImage.position,
                thumbnailUrl,
                active: true,
                store: event.storeId,
                product: productId,
              },
              upsert: true
            }
          }
        })
      });
      const images = await ImageModel.bulkWrite([].concat.apply([], bulkImageInsert));

      // sync variants for the product
      let bulkVariantInsert = [];
      apiProducts.forEach(product => {
        const productForVariant = dbProducts.find(dbProduct => dbProduct.uniqKey === `${PARTNERS_SHOPIFY}-${product.id}`);

        product.variants.forEach(variant => {
          const onSale = ((variant.compare_at_price != variant.price)) ? true : false;
          if (variant.image_id) {
            variantImages.push({ variantUniqKey: `${PARTNERS_SHOPIFY}-${variant.id}`, imagePartnerId: variant.image_id });
          }

          bulkVariantInsert.push({
            updateOne: {
              filter: { uniqKey: `${PARTNERS_SHOPIFY}-${variant.id}` },
              update: {
                title: variant.title,
                price: variant.price,
                salePrice: variant.compare_at_price,
                onSale: onSale,
                uniqKey: `${PARTNERS_SHOPIFY}-${variant.id}`,
                partner: PARTNERS_SHOPIFY,
                partnerId: variant.id,
                partnerCreatedAt: variant.created_at,
                partnerUpdatedAt: variant.updated_at,
                position: variant.position,
                quantity: variant.inventory_quantity,
                store: event.storeId,
                product: productForVariant._id,
                postableByImage: productForVariant.postableByImage,
                postableByQuantity: (variant.inventory_quantity > 0) ? true : false,
                postableByPrice: (variant.price > 0) ? true : false,
                postableIsNew: (moment(variant.created_at).isAfter(moment().subtract(7, 'days'))) ? true : false,
                postableBySale: onSale,
                active: true
              },
              upsert: true
            }
          });
        })
      });
      const variants = await VariantModel.bulkWrite(bulkVariantInsert);


      // now all the images and variants are synced. now we need to create relationship with products
      // first images that are recently synced.
      const dbImages = await ImageModel.where('product').in(dbProducts.map(product => product._id));
      dbImages.forEach(image => {
        if (_.isEmpty(productImages[image.product])) {
          productImages[image.product] = [];
        }
        productImages[image.product].push(image._id)
      })
      // variants that are recently synced.
      const dbVariants = await VariantModel.where('product').in(dbProducts.map(product => product._id)).select('_id product uniqKey');
      dbVariants.forEach(image => {
        if (_.isEmpty(productVariants[image.product])) {
          productVariants[image.product] = [];
        }
        productVariants[image.product].push(image._id)
      })
      // query to update variants. 
      bulkProductUpdate = dbProducts.map(product => {
        return {
          updateOne: {
            filter: { _id: product._id },
            update: {
              images: productImages[product._id],
              variants: productVariants[product._id],
            }
          }
        }
      })
      const r = await ProductModel.bulkWrite(bulkProductUpdate);

      // variants may also have images. so syncing images with varaints. 
      const bulkVariantImages = variantImages.map(variantImage => {
        const image = dbImages.find(dbImage => dbImage.imgUniqKey === `product-${PARTNERS_SHOPIFY}-${variantImage.imagePartnerId}`);
        const variant = dbVariants.find(dbVariant => dbVariant.uniqKey === variantImage.variantUniqKey);
        return {
          updateOne: {
            filter: { imgUniqKey: `variant-${PARTNERS_SHOPIFY}-${variantImage.imagePartnerId}` },
            update: {
              partnerSpecificUrl: image.partnerSpecificUrl,
              partnerId: image.partnerId,
              partneCreatedAt: image.partneCreatedAt,
              partnerUpdatedAt: image.partnerUpdatedAt,
              partner: PARTNERS_SHOPIFY,
              position: image.position,
              thumbnailUrl: image.thumbnailUrl,
              active: true,
              store: event.storeId,
              variant: variant._id,
            },
            upsert: true
          }
        }
      });

      const t = await ImageModel.bulkWrite(bulkVariantImages);
      const dbVariantImages = await ImageModel.where('variant').in(dbVariants.map(variant => variant._id));

      const bulkVariantUpdate = dbVariantImages.map(variantImage => {
        return {
          updateOne: {
            filter: { _id: variantImage.variant },
            update: {
              images: variantImage._id,
            }
          }
        }
      });
      const s = await VariantModel.bulkWrite(bulkVariantUpdate);
      // all done.
    }
  },
}
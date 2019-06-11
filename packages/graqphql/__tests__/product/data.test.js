const graphql = require('graphql').graphql;
const mongoose = require('mongoose');
const schema = require('../executableSchema').schema;

const storeStub = require("../store/stubs");
const productStub = require("./stubs");

describe('Product Model', () => {
  let storeId, products;
  // beforeEach
  beforeAll(async (done) => {
    if (mongoose.connection.readyState === 2) {
      mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useCreateIndex: true }, async function () {
        for (let i in mongoose.connection.collections) {
          const res = await mongoose.connection.collections[i].deleteMany({ _id: { $exists: true } });
        }
      })
    }
    const storeDetail = await storeStub.createStoreStub();
    storeId = storeDetail._id;
    products = await productStub.createProductStub(storeId, 10);
    done();
  });

  // -------------------------- listProductsTestCase --------------------------
  test(`List Products`, async () => {
    const productsExpected = {}
    const listProductsTestCase = {
      id: 'List Not Connected Products',
      query: `
      query {
        listProducts(filter: { store: { eq: "${storeId}"}}) {
          title
        }
      }
    `,
      variables: {},
      context: {},
      expected: { data: { listProducts: [productsExpected] } }
    };
    const result = await graphql(schema, listProductsTestCase.query, null, listProductsTestCase.context, listProductsTestCase.variables);
    // console.log('result', result);
    expect(result.data.listProducts).not.toBeNull();
  }, 30000);


})
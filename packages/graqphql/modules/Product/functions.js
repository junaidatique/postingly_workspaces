const storeFunctions = require('../Store/functions');
const formattedProduct = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store)
  }
}
exports.formattedProduct = formattedProduct
const storeFunctions = require('../Store/functions');
const formattedRule = async (rule) => {
  return {
    ...rule._doc,
    id: rule._id,
    store: storeFunctions.getStoreByID.bind(this, rule._doc.store)
  }
}
exports.formattedRule = formattedRule
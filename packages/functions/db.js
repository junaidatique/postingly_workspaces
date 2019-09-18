
const mongoose = require('mongoose');
let conn = null;
module.exports = {
  createConnection: async function (context) {
    if (process.env.IS_OFFLINE === 'false') {
      context.callbackWaitsForEmptyEventLoop = false;
      if (conn === null) {
        conn = await mongoose.connect(process.env.MONGODB_URL, {
          useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
          bufferMaxEntries: 0
        });
        // mongoose.set("debug", (collectionName, method, query, doc) => {
        //   console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
        // });
      }
    }
  }
}
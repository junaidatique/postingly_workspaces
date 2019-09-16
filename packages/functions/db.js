
const mongoose = require('mongoose');
let conn = null;
module.exports = {
  createConnection: async function (context) {
    if (!process.env.IS_OFFLINE) {
      context.callbackWaitsForEmptyEventLoop = false;
      if (conn === null) {
        conn = await mongoose.createConnection(process.env.MONGODB_URL, {
          useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
          bufferMaxEntries: 0
        });
      }
    }
  }
}
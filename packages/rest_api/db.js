const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let conn = null;

module.exports = connectToDatabase = async () => {
  if (conn) {
    console.log('=> using existing database connection');
    return conn;
  }

  console.log('=> using new database connection');
  // return mongoose.connect(process.env.MONGODB_URL)
  //   .then(db => {
  //     isConnected = db.connections[0].readyState;
  //   });
  return await mongoose.createConnection(process.env.MONGODB_URL, {
    useNewUrlParser: true, useCreateIndex: true, bufferCommands: false,
    bufferMaxEntries: 0
  });
};
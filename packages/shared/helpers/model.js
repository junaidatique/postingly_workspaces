const dynamodb = require('./dynamodb')

module.exports = {
  getItem: async function (tableName, key_object) {
    console.log("get item table", tableName)
    var params = {
      TableName: tableName,
      Key: key_object,
    };

    try {
      const data = await dynamodb.get(params).promise();
      if (data.length === undefined) {
        return undefined;
      }
      return data;
    } catch (err) {
      console.log("dynamodb getItem", err)
    }

  },
  putItem: async function (tableName, item) {
    console.log("put item table", tableName)
    console.log("put item item", item)
    var params = {
      TableName: tableName,
      Item: item
    };
    try {
      const data = await dynamodb.put(params);
      const data1 = data.promise();
    } catch (err) {
      console.log("dynamodb putItem", err)
    }


  },


}
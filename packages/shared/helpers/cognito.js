const AWS = require("aws-sdk");;
module.exports = {
  createUser: async function (email, shopDomain) {
    console.log("createUser email", email);
    console.log("createUser shopDomain", shopDomain);
    AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION });
    const identityProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      console.log("USER_POOL_ID environment variable not set");
      throw new Error("USER_POOL_ID environment variable not set");
    }

    const userParams = {
      // MessageAction: "SUPPRESS",
      TemporaryPassword: "Abc@1234",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: shopDomain },

      ],
      UserPoolId: userPoolId,
      Username: email,
    };
    console.log("createUser userParams", userParams);
    try {
      const result = await identityProvider.adminCreateUser(userParams).promise();
      console.log("createUser identityProvider User", result.User);
      if (result.User && result.User.Username) {
        return result.User.Username;
      }
      throw Error("No username!!");
    } catch (err) {
      if (err.code === "UsernameExistsException") {
        const user = await identityProvider.adminGetUser({
          UserPoolId: userPoolId,
          Username: email,
        }).promise();
        console.log("createUser adminGetUser User", user);
        return user.Username;
      }
      throw err;
    }
  },
}
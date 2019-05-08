const fetch = require("node-fetch");
const querystring = require('querystring')
const query = require("../helpers/model");

const { FACEBOOK_GRPAHAPI_URL } = require("../constants");
module.exports = {
  login: async function (storeId, code, serviceProfile) {
    console.log(" -- FB Login Start -- ");
    try {
      const accessToken = await this.getAccessToken(code);
      const response = await this.getProfile(storeId, accessToken, serviceProfile);

      console.log(" -- FB Login End -- ");
    } catch (error) {
      console.log(" -- FB Login Error -- ");
      throw new Error(error.message);
    }
  },
  getAccessToken: async function (code) {
    console.log(" -- FB Get Access Token Start -- ");
    try {
      const accessTokenUrl = `${FACEBOOK_GRPAHAPI_URL}oauth/access_token`;
      var paramsAccessToken = {
        code: code,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.FRONTEND_URL}facebook-callback`
      };
      query = querystring.stringify(paramsAccessToken);
      const accessTokenResponse = await fetch(`${accessTokenUrl}?${query}`);
      const response = await accessTokenResponse.json();
      if (accessTokenResponse.status === 200) {
        console.log("Fb Login Access Token Recieved");
        console.log(" -- FB Get Access Token End -- ");
        return response.access_token;
      } else {
        console.log("Fb Login Access Token Not Recieved");
        throw new Error(accessTokenResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB Get Access Token Error -- ");
      throw new Error(error.message);
    }
  },
  getExtendedToken: async function (shortLivedAccessToken) {
    console.log(" -- FB getExtendedToken Start -----------------");
    console.log("FB getExtendedToken ", shortLivedAccessToken);
    try {
      const graphApiUrl = `${FACEBOOK_GRPAHAPI_URL}oauth/access_token`;
      var paramsToExtendToken = {
        fb_exchange_token: shortLivedAccessToken,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: 'fb_exchange_token'
      };
      extendedTokenQuery = querystring.stringify(paramsToExtendToken);
      const extendedTokenResponse = await fetch(`${graphApiUrl}&${extendedTokenQuery}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
      const extendedToken = await extendedTokenResponse.json();
      if (extendedTokenResponse.status === 200) {
        console.log("Fb getExtendedToken Recieved", extendedToken);
        console.log(" -- FB getExtendedToken End -- ");
        return extendedToken.access_token;
      } else {
        console.log("Fb getExtendedToken Not Recieved", extendedTokenResponse);
        console.log("Fb getExtendedToken Not Recieved", extendedToken);
        throw new Error(extendedTokenResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getExtendedToken Error -- ");
      throw new Error(error.message);
    }

  },
  getUserDetail: async function (storeId, accessToken) {
    console.log(" -- FB getUserDetail Start -- ");
    console.log("FB getUserDetail ", accessToken);
    try {
      const fields = ['id', 'email', 'link', 'name', 'picture'];
      const graphApiUrl = `${FACEBOOK_GRPAHAPI_URL}me?fields=` + fields.join(',');
      accessTokenQuery = querystring.stringify({ access_token: accessToken });
      const userDetailResponse = await fetch(`${graphApiUrl}&${accessTokenQuery}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
      const userResponse = await userDetailResponse.json();
      if (userDetailResponse.status === 200) {
        console.log("FB getUserDetail Recieved", userResponse);
        console.log(" -- FB getUserDetail End -- ");

        const userParams = {
          id: `facebook_profile-${userResponse.id}`,
          name: userResponse.name,
          avatarUrl: userResponse.picture.data.url,
          serviceUserId: userResponse.id,
          // serviceUsername: userResponse.link,
          profileURL: userResponse.link,
          accessToken: accessToken,
          // accessTokenSecret: "",
          service: "facebook",
          serviceProfile: "facebook_profile",
          // bufferId: "",
          isConnected: true,
          isTokenExpired: false,
          isSharePossible: false,
          profileStoreId: storeId
        };
        console.log("userparams", userParams);
        profile = await query.putItem(process.env.PROFILE_TABLE, userParams);
        return userParams;
      } else {
        console.log("Fb getUserDetail Not Recieved");
        throw new Error(userDetailResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getUserDetail Error -- ");
      throw new Error(error.message);
    }


  },
  getProfile: async function (storeId, accessToken, serviceProfile) {
    try {
      const userDetail = await this.getUserDetail(storeId, accessToken);
      if (serviceProfile === 'facebook_page') {
        const userPages = await this.getPages(storeId, accessToken);
      } else {

      }
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getPages: async function (storeId, accessToken) {
    console.log(" -- FB getPages Start -- ");
    console.log("FB getPages ", accessToken);
    try {
      const graphApiUrl = `${FACEBOOK_GRPAHAPI_URL}me?fields=accounts.limit(5000){access_token,description,is_published,username,picture,link}`;
      console.log("FB getPages graphApiUrl", graphApiUrl);
      accessTokenQuery = querystring.stringify({ access_token: accessToken });
      const pagesDetailResponse = await fetch(`${graphApiUrl}&${accessTokenQuery}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
      const pageResponse = await pagesDetailResponse.json();
      if (pagesDetailResponse.status === 200) {
        // console.log("FB getPages Recieved", pageResponse.accounts.data);
        for (pageProfile of pageResponse.accounts.data) {
          const pageParams = {
            id: `facebook_page-${pageProfile.id}`,
            name: pageProfile.name,
            avatarUrl: pageProfile.picture.data.url,
            serviceUserId: pageProfile.id,
            // serviceUsername: userResponse.link,
            profileURL: pageProfile.link,
            accessToken: accessToken,
            // accessTokenSecret: "",
            service: "facebook",
            serviceProfile: "facebook_page",
            // bufferId: "",
            isConnected: true,
            isTokenExpired: false,
            isSharePossible: true,
            storeId: storeId
          };
          console.log("pageParams", pageParams);
          profile = await query.putItem(process.env.PROFILE_TABLE, pageParams);
        }

        // const responseProfiles = await dynamodb.query({
        //   TableName: process.env.profileTable,
        //   KeyConditionExpression: "serviceProfile = :sp and isSharePossible = :isp",
        //   ExpressionAttributeValues: {
        //     ":sp": "facebook_page",
        //     ":isp": true
        //   }
        // }).promise();

        // console.log(" -- FB getPages End -- ", responseProfiles);
        // return responseProfiles;
        return '';
      } else {
        console.log("Fb getPages Not Recieved");
        throw new Error(userDetailResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getPages Error -- ");
      throw new Error(error.message);
    }
  }
}
const fetch = require("node-fetch");
const querystring = require('querystring')
const ProfileModel = require('shared').ProfileModel;
const StoreModel = require('shared').StoreModel;

const { FACEBOOK_SERVICE, FACEBOOK_GRPAHAPI_URL, FACEBOOK_PROFILE, FACEBOOK_PAGE } = require('shared/constants');
module.exports = {
  login: async function (storeId, code, serviceProfile) {
    console.log(" -- FB Login Start -- ");
    try {
      const accessToken = await this.getAccessToken(code);
      const response = await this.getProfile(storeId, accessToken, serviceProfile);
      return response;
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
      console.log('getAccessToken paramsAccessToken', paramsAccessToken)
      queryStr = querystring.stringify(paramsAccessToken);
      const accessTokenResponse = await fetch(`${accessTokenUrl}?${queryStr}`);
      const response = await accessTokenResponse.json();
      if (accessTokenResponse.status === 200) {
        console.log("Fb Login Access Token Recieved");
        console.log(" -- FB Get Access Token End -- ");
        return response.access_token;
      } else {
        console.log("Fb Login Access Token Not Recieved", response);
        throw new Error(response.error.message);
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
    console.log(" -- FB getUserDetail Start -- ", storeId);
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
        console.log("FB getUserDetail Recieved");
        const uniqKey = `${FACEBOOK_PROFILE}-${storeId}-${userResponse.id}`;
        let profile = await ProfileModel.findOne({ uniqKey: uniqKey });
        console.log("TCL: getUserDetail profile", profile)
        if (profile === null) {
          const userParams = {
            uniqKey: `${FACEBOOK_PROFILE}-${storeId}-${userResponse.id}`,
            name: userResponse.name,
            avatarUrl: userResponse.picture.data.url,
            serviceUserId: userResponse.id,
            profileURL: userResponse.link,
            accessToken: accessToken,
            service: FACEBOOK_SERVICE,
            serviceProfile: FACEBOOK_PROFILE,
            isConnected: true,
            isTokenExpired: false,
            isSharePossible: false,
            store: storeId
          };
          console.log("userparams", userParams);
          const profileInstance = new ProfileModel(userParams);
          profile = await profileInstance.save();
          const storeDetail = await StoreModel.findById(storeId);
          await storeDetail.profiles.push(profile);
        }

        console.log(" -- FB getUserDetail End -- ");
        return profile;
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
      let profile;
      if (serviceProfile === FACEBOOK_PAGE) {
        profile = await this.getPages(storeId, userDetail._id, accessToken);
      } else {

      }
      console.log("TCL: profile", profile)
      return profile;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getPages: async function (storeId, parentId, accessToken) {
    console.log("TCL: storeId", storeId)
    console.log("TCL: parentId", parentId)
    console.log(" -- FB getPages Start -- ");
    console.log("FB getPages ", accessToken);

    const parent = await ProfileModel.findById(parentId);
    try {
      const graphApiUrl = `${FACEBOOK_GRPAHAPI_URL}me?fields=accounts.limit(5000){access_token,description,is_published,username,name,picture,link,id}`;
      console.log("TCL: graphApiUrl -> graphApiUrl", graphApiUrl);
      getPagesQuery = querystring.stringify({ access_token: accessToken });
      const pagesDetailResponse = await fetch(`${graphApiUrl}&${getPagesQuery}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
      const pageResponse = await pagesDetailResponse.json();
      if (pagesDetailResponse.status === 200) {
        console.log("FB getPages Recieved", pageResponse);
        const bulkProfileInsert = pageResponse.accounts.data.map(pageProfile => {
          const uniqKey = `${FACEBOOK_PAGE}-${storeId}-${pageProfile.id}`;
          return {
            updateOne: {
              filter: { uniqKey: uniqKey },
              update: {
                name: pageProfile.name,
                avatarUrl: pageProfile.picture.data.url,
                serviceUserId: pageProfile.id,
                profileURL: pageProfile.link,
                accessToken: accessToken,
                service: FACEBOOK_SERVICE,
                serviceProfile: FACEBOOK_PAGE,
                store: storeId,
                parent: parentId,
                isSharePossible: true
              },
              upsert: true
            }
          }
        });
        const pageProfiles = await ProfileModel.bulkWrite(bulkProfileInsert);
        const storeProfiles = await ProfileModel.find({ store: storeId }).select('_id');
        const store = await StoreModel.findById(storeId);
        store.profiles = storeProfiles;
        await store.save();
        const childProfiles = await ProfileModel.find({ parent: parentId }).select('_id');
        parent.childrent = childProfiles;
        await parent.save();
        console.log("TCL: parent", parent)
        return parent;
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
const fetch = require("node-fetch");
const querystring = require('querystring')
const ProfileModel = require('shared').ProfileModel;
const ProductModel = require('shared').ProductModel;
const StoreModel = require('shared').StoreModel;
const { FB_ALBUM_TYPES } = require('shared/constants');
const _ = require('lodash')
const {
  FACEBOOK_SERVICE, FACEBOOK_GRAPH_API_URL, FACEBOOK_PROFILE,
  FACEBOOK_PAGE, FACEBOOK_GROUP, FAILED,
  POSTED, FB_DEFAULT_ALBUM, FB_DEFAULT_ALBUM_TYPE
} = require('shared/constants');
module.exports = {
  login: async function (storeId, code, serviceProfile) {
    console.log(" -- FB Login Start -- ");
    try {
      const accessToken = await this.getAccessToken(code);
      const permissions = await this.getPermission(accessToken, serviceProfile);
      const response = await this.getProfile(storeId, accessToken, serviceProfile);
      return response;
      console.log(" -- FB Login End -- ");
    } catch (error) {
      console.log(" -- FB Login Error -- ");
      throw new Error(error);
    }
  },
  getAccessToken: async function (code) {
    console.log(" -- FB Get Access Token Start -- ");
    try {
      const accessTokenUrl = `${FACEBOOK_GRAPH_API_URL}oauth/access_token`;
      var paramsAccessToken = {
        code: code,
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.FRONTEND_URL}facebook-callback`
      };
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
  getPermission: async function (accessToken) {
    try {
      const requestBody = {
        access_token: accessToken
      }
      const queryStr = querystring.stringify(requestBody);
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}me/permissions?${queryStr}`;
      console.log("TCL: getPermission graphApiUrl -> graphApiUrl", graphApiUrl);
      const getPermissionResponse = await fetch(`${graphApiUrl}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        }
      });

      const getPermissionResponseJson = await getPermissionResponse.json();
      const permissionDeclinedCount = getPermissionResponseJson.data.map(permission => {
        if (permission.permission === "email" && permission.status === 'declined') {
          return permission;
        }
        if (permission.permission === "manage_pages" && permission.status === 'declined') {
          return permission;
        }
        if (permission.permission === "publish_pages" && permission.status === 'declined') {
          return permission;
        }
      }).filter(function (item) {
        return !_.isUndefined(item);
      }).length;
      console.log("TCL: permissionDeclinedCount", permissionDeclinedCount)
      if (permissionDeclinedCount > 0) {
        throw new Error("Please allow all permissions.");
      } else {
        return false;
      }

    } catch (error) {
      console.log(" -- FB getPermission Error -- ");
      throw new Error(error);
    }
  },
  getExtendedToken: async function (shortLivedAccessToken) {
    try {
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}oauth/access_token`;
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
        return extendedToken.access_token;
      } else {
        throw new Error(extendedTokenResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getExtendedToken Error -- ");
      throw new Error(error.message);
    }

  },
  getUserDetail: async function (storeId, accessToken) {
    try {
      const fields = ['id', 'email', 'link', 'name', 'picture'];
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}me?fields=` + fields.join(',');
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
          const profileInstance = new ProfileModel(userParams);
          profile = await profileInstance.save();
          const storeDetail = await StoreModel.findById(storeId);
          await storeDetail.profiles.push(profile);
        }

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
      } else if (serviceProfile === FACEBOOK_GROUP) {
        profile = await this.getGroups(storeId, userDetail._id, accessToken);
      }
      return profile;
    } catch (error) {
      throw new Error(error.message);
    }
  },
  getPages: async function (storeId, parentId, accessToken) {
    const parent = await ProfileModel.findById(parentId);
    try {
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}me?fields=accounts.limit(5000){access_token,description,is_published,username,name,picture,link,id}`;
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
        if (!_.isUndefined(pageResponse.accounts) && !_.isNull(pageResponse.accounts) && !_.isEmpty(pageResponse.accounts.data)) {
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
                  accessToken: pageProfile.access_token,
                  service: FACEBOOK_SERVICE,
                  serviceProfile: FACEBOOK_PAGE,
                  store: storeId,
                  parent: parentId,
                  isSharePossible: true,
                  isTokenExpired: false
                },
                upsert: true
              }
            }
          });
          const pageProfiles = await ProfileModel.bulkWrite(bulkProfileInsert);
        }
        const storeProfiles = await ProfileModel.find({ store: storeId }).select('_id');
        const store = await StoreModel.findById(storeId);
        store.profiles = storeProfiles;
        await store.save();
        const childProfiles = await ProfileModel.find({ parent: parentId }).select('_id');
        parent.children = childProfiles;
        await parent.save();
        return parent;
      } else {
        console.log("Fb getPages Not Recieved");
        throw new Error(userDetailResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getPages Error -- ");
      throw new Error(error.message);
    }
  },
  getGroups: async function (storeId, parentId, accessToken) {
    const parent = await ProfileModel.findById(parentId);
    try {
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}me/groups?admin_only=true`;
      getGroupsQuery = querystring.stringify({ access_token: accessToken });
      const groupsDetailResponse = await fetch(`${graphApiUrl}&${getGroupsQuery}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
      const groupResponse = await groupsDetailResponse.json();
      if (groupsDetailResponse.status === 200) {
        const bulkProfileInsert = groupResponse.data.map(groupProfile => {
          const uniqKey = `${FACEBOOK_GROUP}-${storeId}-${groupProfile.id}`;
          return {
            updateOne: {
              filter: { uniqKey: uniqKey },
              update: {
                name: groupProfile.name,
                avatarUrl: null,
                serviceUserId: groupProfile.id,
                profileURL: null,
                accessToken: accessToken,
                service: FACEBOOK_SERVICE,
                serviceProfile: FACEBOOK_GROUP,
                store: storeId,
                parent: parentId,
                isSharePossible: true,
                isTokenExpired: false
              },
              upsert: true
            }
          }
        });
        const groupProfiles = await ProfileModel.bulkWrite(bulkProfileInsert);
        const storeProfiles = await ProfileModel.find({ store: storeId }).select('_id');
        const store = await StoreModel.findById(storeId);
        store.profiles = storeProfiles;
        await store.save();
        const childProfiles = await ProfileModel.find({ parent: parentId }).select('_id');
        parent.children = childProfiles;
        await parent.save();
        return parent;
      } else {
        console.log("Fb getGroups Not Recieved");
        throw new Error(userDetailResponse.statusText);
      }
    } catch (error) {
      console.log(" -- FB getGroups Error -- ");
      throw new Error(error.message);
    }
  },
  shareFacebookPostAsAlbum: async function (update) {
    const profile = await ProfileModel.findById(update.profile);
    if (profile.serviceProfile === FACEBOOK_GROUP) {
      return this.shareFacebookPostAsPhoto(update);
    }
    let albumTitle = update.titleForCaption;
    if (!albumTitle) {
      const productDetail = await ProductModel.findOne(update.product);
      albumTitle = productDetail.title;
    }
    const albumResponse = await this.createAlbum(profile.serviceUserId, albumTitle, update.text, profile.accessToken);
    const albumCreateResponse = albumResponse.albumCreateResponse;
    const albumCreateResponseJson = albumResponse.albumCreateResponseJson;
    if (albumCreateResponse.status === 200) {
      const fbAlbumId = albumCreateResponseJson.id;
      let fbImages = [];
      await Promise.all(update.images.map(async image => {
        const imageresponse = await this.shareImage(fbAlbumId, image.url, update.text, profile.accessToken);
        fbImages.push(imageresponse);
      }));
      return {
        scheduleState: POSTED,
        response: {
          albumId: fbAlbumId,
          serviceImages: fbImages
        },
        failedMessage: null
      };
    } else {
      return {
        scheduleState: FAILED,
        failedMessage: albumCreateResponseJson.error.message,
        response: null,
      }
    }
  },
  shareFacebookPostAsLink: async function (update) {
    const profile = await ProfileModel.findById(update.profile);
    const store = await StoreModel.findById(profile.store);
    const itemLink = update.productExternalURL;
    if (!update.images) {
      return {
        scheduleState: FAILED,
        failedMessage: "type unrecognized",
        response: null,
      }
    }

    let image = `https://posting.ly/image?url=${update.images[0].url}`
    if (store.postFullImageOnPostAsLink) {
      image = update.images[0].url;
    }

    const requestBody = {
      message: update.text,
      link: itemLink,
      picture: image,
      published: 1,
      description: update.text,
      access_token: profile.accessToken,
      call_to_action: { "type": "Shop Now", "value": { "link": itemLink } }
    }
    const queryStr = querystring.stringify(requestBody);
    const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}${profile.serviceUserId}/feed?${queryStr}`;
    const linkCreateResponse = await fetch(`${graphApiUrl}`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const linkCreateResponseJson = await linkCreateResponse.json();
    if (linkCreateResponse.status === 200) {
      return {
        scheduleState: POSTED,
        response: {
          albumId: null,
          serviceImages: {
            servicePostId: linkCreateResponseJson.id,
            serviceId: null,
            status: linkCreateResponse.status
          }
        },
        failedMessage: null
      };
    } else {
      return {
        scheduleState: FAILED,
        failedMessage: linkCreateResponseJson.error.message,
        response: null,
      }
    }
  },
  shareFacebookPostAsPhoto: async function (update) {
    const profile = await ProfileModel.findById(update.profile);
    let fbDefaultAlbum = null;
    if (profile.serviceProfile === FACEBOOK_GROUP) {
      fbDefaultAlbum = profile.serviceUserId;
    } else {
      fbDefaultAlbum = profile.fbDefaultAlbum;
    }

    const imageResponse = await this.shareImage(fbDefaultAlbum, update.images[0].url, update.text, profile.accessToken);
    if (imageResponse.status === 200) {
      return {
        scheduleState: POSTED,
        response: {
          albumId: fbDefaultAlbum,
          serviceImages: {
            servicePostId: imageResponse.servicePostId,
            serviceId: imageResponse.serviceId,
            status: imageResponse.status
          }
        },
        failedMessage: null
      };
    } else {
      return {
        scheduleState: FAILED,
        failedMessage: imageResponse.message,
        response: null,
      }
    }
  },
  shareImage: async function (albumId, imageUrl, caption, accessToken) {
    const requestBody = {
      url: imageUrl,
      caption: caption,
      access_token: accessToken
    }
    try {
      const queryStr = querystring.stringify(requestBody);
      const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}me/photos?${queryStr}`;
      const imageUploadResponse = await fetch(`${graphApiUrl}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const imageUploadResponseJson = await imageUploadResponse.json();
      if (imageUploadResponse.status === 200) {
        return {
          servicePostId: imageUploadResponseJson.post_id,
          serviceId: imageUploadResponseJson.id,
          status: imageUploadResponse.status
        }
      } else {
        return {
          status: imageUploadResponse.status,
          message: imageUploadResponseJson.error.message,
        }
      }
    } catch (error) {
      return {
        status: 500,
        message: error.message,
      }
    }

  },
  getDefaultAlbum: async function (profileId, serviceUserId, accessToken, after) {
    const profile = await ProfileModel.findById(profileId);
    const fields = ['id', 'can_upload', 'count', 'event', 'from', 'link', 'location', 'name', 'type'];
    const requestBody = {
      access_token: accessToken,
      fields: fields.join(',')
    }
    const queryStr = querystring.stringify(requestBody);
    let graphApiUrl = `${FACEBOOK_GRAPH_API_URL}${serviceUserId}/albums?${queryStr}&limit=100`;
    if (!_.isNull(after)) {
      graphApiUrl = `${graphApiUrl}&after=${after}`
    }
    const albumGetResponse = await fetch(`${graphApiUrl}`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
    const albumGetResponseJson = await albumGetResponse.json();
    if (albumGetResponse.status === 200) {
      if (albumGetResponseJson.data.length > 0) {
        const fbAlbums = albumGetResponseJson.data.map(album => {
          if (FB_ALBUM_TYPES.includes(album.type)) {
            return {
              albumId: album.id,
              name: album.name,
              type: album.type
            }
          }
        }).filter(album => {
          return !_.isUndefined(album);
        })
        const albumsToBeUpdated = fbAlbums.concat(profile.fbAlbums);
        const uniqFbAlbums = [...new Map(albumsToBeUpdated.map(item => [item['albumId'], item])).values()];
        await ProfileModel.updateOne({ _id: profileId }, { fbAlbums: uniqFbAlbums });
        if (albumGetResponseJson.paging) {
          await this.getDefaultAlbum(profileId, serviceUserId, accessToken, albumGetResponseJson.paging.cursors.after)
        }
      } else {
        const profileUpdated = await ProfileModel.findById(profileId);
        console.log("profileUpdated", profileUpdated.fbAlbums)
        const defaultAlbumId = profileUpdated.fbAlbums.map(album => {
          if (album.type === FB_DEFAULT_ALBUM_TYPE) {
            return album.albumId;
          } else {
            return undefined;
          }
        }).filter(album => {
          return !_.isUndefined(album);
        })[0]
        console.log("defaultAlbumId", defaultAlbumId)
        if (defaultAlbumId) {
          await ProfileModel.updateOne({ _id: profileId }, { fbDefaultAlbum: defaultAlbumId });
          return {
            status: albumGetResponse.status,
            defaultAlbumId: defaultAlbumId
          }
        } else {
          return {
            status: albumGetResponse.status,
            defaultAlbumId: null,
          }
        }
      }




    } else {
      return {
        status: albumGetResponse.status,
        message: albumGetResponseJson.error.message,
      }
    }
  },
  createAlbum: async function (serviceUserId, albumTitle, albumtText, accessToken) {
    const requestBody = {
      name: albumTitle,
      message: albumtText,
      access_token: accessToken,
      type: 'wall'
    }
    const queryStr = querystring.stringify(requestBody);
    const graphApiUrl = `${FACEBOOK_GRAPH_API_URL}${serviceUserId}/albums?${queryStr}`;
    const albumCreateResponse = await fetch(`${graphApiUrl}`, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const albumCreateResponseJson = await albumCreateResponse.json();
    return {
      albumCreateResponse,
      albumCreateResponseJson
    }
  },

}
// const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
// const requireGraphQLFile = require('require-graphql-file');
// const graphql = require('graphql').graphql;
// const faker = require('faker');
// const resolvers = require("../../modules/resolvers")
// const typeDefs = requireGraphQLFile('../../schema/schema');


// const item = {
//   id: '1',

// }

// const listUpdateCase = {
//   id: 'List Updates Query',
//   query: `
//       query {
//         listUpdates {
//           items{
//             id

//           }
//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: {
//     data: {
//       listUpdates: {
//         items: [
//           item,
//           item
//         ]
//       }
//     }
//   }
// };
// const getUpdateCase = {
//   id: 'List Update Query',
//   query: `
//       query {
//         getUpdate(id: "1") {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { getStore: item } }
// };
// const createUpdateCase = {
//   id: 'Create Update Mutation',
//   query: `
//       mutation {
//         createUpdate (input: {id: "Title"}) {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { createStore: item } }
// };
// const updateUpdateCase = {
//   id: 'Update Update Mutation',
//   query: `
//       mutation {
//         updateUpdate (input: {id: "Title", title: "Title"}) {
//           id

//         }
//       }
//     `,
//   variables: {},
//   context: {},
//   expected: { data: { updateStore: item } }
// };



// describe('Profile Model', () => {
//   const cases = [listUpdateCase, getUpdateCase, createUpdateCase, updateUpdateCase];
//   const schema = makeExecutableSchema({ typeDefs: typeDefs, resolvers: resolvers })
//   cases.forEach(obj => {
//     const { id, query, variables, context, expected } = obj
//     test(`${id}`, async () => {
//       const result = await graphql(schema, query, null, context, variables)
//       return expect(result).toEqual(expected)
//     })
//   })
// })
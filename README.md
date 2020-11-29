# Postingly Backend
This repository contains Postingly Backend. This is built using the [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/). This basically means that there are 3 separate  projects and one folder contains all the shared code. 
It is build on top of serverless frame work for NodeJS. The DB we are using for this project is mongoDB.
It has 4 sections. Three sections has serverless files in it. The 4th one contains shared code among all the other 3 folders. 

## Functions
This folder contains AWS Lambda functions. There are two types of lambda functions
1. Cron Lambda functions
These kinds of functions that are triggered on regular interval to invoke other functions. 
2. Simple lambda functions, 
These functions are invoked from other sources such as REST API and these are the functions that actually perform the updates. 

## REST API
Rest api is used to connect 3rd party e-commerce stores
This currently handles Shopify API. It has functions for
* Shopify Auth,
* Shopify Payments
* Shopify Webhooks
* Twitter request token


## GRAPHQL API
This folder includes the implementation of the graphql api used for react app. This graphqQL implementation is carried out using [Apollo](https://www.apollographql.com/).

## Shared
This folder contains all the service classes that are shared between the three projects. 

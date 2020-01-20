![Cryb OSS](.github/api-icon.png "@cryb/api Logo")

_**API** - Core services_

[![GitHub contributors](https://img.shields.io/github/contributors/crybapp/api)](https://github.com/crybapp/api/graphs/contributors) [![License](https://img.shields.io/github/license/crybapp/api)](https://github.com/crybapp/api/blob/master/LICENSE) [![Patreon Donate](https://img.shields.io/badge/donate-Patreon-red.svg)](https://patreon.com/cryb)

## Docs
* [Info](#info)
    * [Status](#status)
* [Codebase](#codebase)
    * [Folder Structure](#folder-structure)
		* [Code Style](#code-style)
    * [First time setup](#first-time-setup)
        * [Installation](#installation)
    * [Running the app locally](#running-the-app-locally)
        * [Background services](#background-services)
        * [Starting @cryb/api](#starting-@cryb/api)
* [Questions / Issues](#questions--issues)

## Info
`@cryb/api` is the core service used to handle requests from clients over REST and WebSocket.

Events such as Room creation, user authentication and requests to `@cryb/portals` to create VM instances are sent from `@cryb/api`.

### Status
`@cryb/api` has been actively developed internally since August 2019, and is now open source as of October 2019.

## Codebase
The codebase for `@cryb/api` is written in JavaScript, utilising TypeScript and Node.js. Express.js is used for our REST API, while the WebSocket API uses the `ws` module.

MongoDB is used as the primary database, while Redis is used for cache and PUB/SUB.

### Code Style
We ask that you follow our [code style guidelines](https://github.com/crybapp/library/blob/master/code-style/STYLE.md) when contributing to this repository.

We use TSLint in order to lint our code. Run `yarn lint` before committing any code to ensure it's clean.

*Note: while we have most rules covered in our `tslint.json` config, it's good practice to familarise yourself with our code style guidelines*

### Folder Structure
```
cryb/api/
└──┐ src # The core source code
   ├── config # Config files for Redis, Passport, etc
   ├── controllers # Our REST route controller files
   ├── drivers # Methods used to talk to other microservices, such as @cryb/portals
   ├── models # Models for our a data types, such as users and rooms
   ├── schemas # Mongoose schema files
   ├── server # Our Express.js setup
   ├── services # Abstractions for Oauth2, etc
   └── utils # Helper methods
```

### First time setup
First, clone the `@cryb/api` repository locally:

```
git clone https://github.com/crybapp/api.git
```

#### Installation
The following services need to be installed for `@cryb/api` to function:

* MongoDB
* Redis

We recommend that you run the following services alongside `@cryb/api`, but it's not required.
* `@cryb/portals`
* `@cryb/aperture`

You also need to install the required dependencies by running `yarn`.

Ensure that `.env.example` is either copied and renamed to `.env`, or is simply renamed to `.env`.

In this file, you'll need some values. Documentation is available in the `.env.example` file.

### Running the app locally

#### Background Services
Make sure that you have installed MongoDB and Redis, and they are both running locally on port 27017 and 6379 respectively.

The command to start MongoDB is `mongod`, and the command to start Redis is `redis-server`.
Most Linux distros will have those packaged, and will start automatically with your system.

If you're developing a feature that requires the VM infrastructure, then make sure `@cryb/portals` and `@cryb/aperture` are running.

#### Starting @cryb/api
To run `@cryb/api` in development mode, run `yarn dev`.

It is recommended that in production you run `yarn build`, then `yarn start`.

## Questions / Issues

If you have an issues with `@cryb/api`, please either open a GitHub issue, contact a maintainer or join the [Cryb Discord Server](https://discord.gg/ShTATH4) and ask in #tech-support.

# node-sockaddr

[![Build Status](https://travis-ci.org/gcampax/node-sockaddr.svg?branch=master)](https://travis-ci.org/gcampax/node-sockaddr) [![Coverage Status](https://coveralls.io/repos/github/gcampax/node-sockaddr/badge.svg?branch=master)](https://coveralls.io/github/gcampax/node-sockaddr?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/gcampax/node-sockaddr.svg)](https://greenkeeper.io/)

A simple library to convert a string into an object suitable to pass to `net.Socket.connect` and `net.Server.listen`.
Useful for configuration files and setting hosts and ports in environment variables.
Supports both Unix domain sockets and TCP sockets.

## Usage

```javascript
const sockaddr = require('sockaddr');

let socket = ...;
socket.connect(sockaddr('hostname:1234'));
```

See [./test.js] for the full set of options supported.
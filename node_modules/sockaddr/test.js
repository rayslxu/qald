// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2013, 2018 Giovanni Campagna <scampa.giovanni@gmail.com>
//
// Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//   * Redistributions of source code must retain the above copyright
//     notice, this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above copyright
//     notice, this list of conditions and the following disclaimer in the
//     documentation and/or other materials provided with the distribution.
//   * Neither the name of the GNOME Foundation nor the
//     names of its contributors may be used to endorse or promote products
//     derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const assert = require('assert');
const sockaddr = require('.');

// IPv4
assert.deepStrictEqual(sockaddr('127.0.0.1'), { host: '127.0.0.1', port: 0 });
assert.deepStrictEqual(sockaddr('127.0.0.1', { defaultPort: 80 }), { host: '127.0.0.1', port: 80 });
assert.deepStrictEqual(sockaddr('127.0.0.1:443'), { host: '127.0.0.1', port: 443 });

// IPv6
assert.deepStrictEqual(sockaddr('[::]'), { host: '::', port: 0 });
assert.deepStrictEqual(sockaddr('[2607:f8b0:4005:806::200e]'), { host: '2607:f8b0:4005:806::200e', port: 0 });
assert.deepStrictEqual(sockaddr('[::]:80'), { host: '::', port: 80 });
assert.deepStrictEqual(sockaddr('[2607:f8b0:4005:806::200e]:80'), { host: '2607:f8b0:4005:806::200e', port: 80 });

// hostnames
assert.deepStrictEqual(sockaddr('google.com'), { host: 'google.com', port: 0 });
assert.deepStrictEqual(sockaddr('google.com:443'), { host: 'google.com', port: 443 });
assert.deepStrictEqual(sockaddr('a'), { host: 'a', port: 0 });
assert.deepStrictEqual(sockaddr('a:443'), { host: 'a', port: 443 });
assert.deepStrictEqual(sockaddr('ab'), { host: 'ab', port: 0 });
assert.deepStrictEqual(sockaddr('ab:443'), { host: 'ab', port: 443 });
assert.deepStrictEqual(sockaddr('a-b'), { host: 'a-b', port: 0 });
assert.deepStrictEqual(sockaddr('a-b:443'), { host: 'a-b', port: 443 });

// ports
assert.deepStrictEqual(sockaddr('1234'), { host: '::', port: 1234 });

// paths
assert.deepStrictEqual(sockaddr('./relative'), { path: './relative' });
assert.deepStrictEqual(sockaddr('/absolute'), { path: '/absolute' });
assert.deepStrictEqual(sockaddr('./relative:80'), { path: './relative:80' });
assert.deepStrictEqual(sockaddr('/absolute:80'), { path: '/absolute:80' });
assert.deepStrictEqual(sockaddr('./1234'), { path: './1234' });
assert.deepStrictEqual(sockaddr('/1234'), { path: '/1234' });

// invalid
assert.throws(() => sockaddr('-foo')); // no dashes at the beginning
assert.throws(() => sockaddr('foo-')); // no dashes at the end
assert.throws(() => sockaddr('foo-:443'));
assert.throws(() => sockaddr('#')); // invalid char
assert.throws(() => sockaddr('::')); // unbracketed IPv6
# string-interp

[![Build Status](https://travis-ci.com/stanford-oval/string-interp.svg?branch=master)](https://travis-ci.org/stanford-oval/string-interp) [![Coverage Status](https://coveralls.io/repos/github/stanford-oval/string-interp/badge.svg?branch=master)](https://coveralls.io/github/stanford-oval/string-interp?branch=master) [![Dependency Status](https://david-dm.org/stanford-oval/string-interp/status.svg)](https://david-dm.org/stanford-oval/string-interp) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/stanford-oval/string-interp.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/stanford-oval/string-interp/context:javascript)

A small library to do shell-style string interpolation, with extensions to make it
useful to prepare messages shown to the user.

This is the library used to replace placeholders in Thingpedia formatted strings.

## Usage

```javascript
const interp = require('string-interp');

// returns "foo bar baz"
interp('foo $p1 ${p2}', { p1: 'bar', p2: 'baz' }, { locale: 'en-US' });
```

## Syntax

The syntax recognizes parameters preceded by a dollar sign `$`.

In the short form, the parameter name follows the dollar sign immediately. In this case, all identifier-like letters following the dollar sign are considered part of the parameter name. Example:

```javascript
interp('$a $a$aa$a,a', { a: '1', aa: '2' }) === '1 121,a'
```

In the long form, the parameter name is wrapped in `{}`. Use this form if the parameter is immediately
followed by another letter or number. Example:

```javascript
interp('${a} ${a}a ${aa}', { a: '1', aa: '2' }) === '1 1a 2'
```

In the long form the parameter can be followed by an option, separated with `:`. Options affect how
the parameter value is transformed into a string. Example:

```javascript
interp('${a} ${a:url}', { a: '/' }) === '/ %2F'
```

### Available options

General options:
- `url`: URL-encode the value with [encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)

Options for `Date`:
- `iso-date`: format a `Date` object as an ISO 8661 string.

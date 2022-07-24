// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

// Unit Tests! Cause I'm testing units! Get it? Get it?

const assert = require('assert');
const TTUnits = require('./lib/index');

function test(v1, u1, v2, u2) {
    assert.strictEqual(TTUnits.normalizeUnit(u1),
        TTUnits.normalizeUnit(u2));

    let vn1 = TTUnits.transformToBaseUnit(v1, u1);
    let vn2 = TTUnits.transformToBaseUnit(v2, u2);
    assert(Math.abs(vn1 - vn2) < 0.00001);

    let v1recovered = TTUnits.transformFromBaseUnit(vn1, u1);
    assert(Math.abs(v1 - v1recovered) < 0.00001);

    let v2recovered = TTUnits.transformFromBaseUnit(vn2, u2);
    assert(Math.abs(v2 - v2recovered) < 0.00001);
}

function main() {
    test(1, 'KB', 1000, 'byte');
    test(1000, 'KB', 1000000, 'byte');
    test(1, 'kcal', 4.183995, 'kJ');
    test(100, 'C', 212, 'F');
    test(32, 'F', 0, 'C');
    test(100, 'C', 373.15, 'K');
    test(1, 'day', 86400, 's');
    test(1, 'week', 7, 'day');
    test(1, 'mon', 30, 'day');
    test(1, 'kg', 2.20462, 'lb');
    test(1, 'ft', 30.48, 'cm');
    test(1, 'ft2', 929.0304, 'cm2');
    test(1, 'ft3', 28316.846592, 'cm3');
    test(1, 'kW', 1000, 'W');
    test(1, 'W', 0.001, 'kW');

    assert.strictEqual(TTUnits.normalizeUnit(''), '');
    assert.throws(() => TTUnits.normalizeUnit('bad'));
}
main();

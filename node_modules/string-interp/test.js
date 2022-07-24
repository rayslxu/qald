// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const assert = require('assert');
const interp = require('./lib').default;

function testBasic() {
    assert.strictEqual(interp('foo'), 'foo');
    assert.strictEqual(interp(''), '');

    assert.strictEqual(interp('$a $a$aa$a,a', { a: '1', aa: '2' }), '1 121,a');
    assert.strictEqual(interp('${a} ${a}a ${aa}', { a: '1', aa: '2' }), '1 1a 2');
    assert.strictEqual(interp('${a} ${a:url}', { a: '/' }), '/ %2F');
    assert.strictEqual(interp('$a$$a', { a: '1' }), '1$a');

    assert.strictEqual(interp('$a\\$a', { a: '1' }), '1$a');
    assert.strictEqual(interp('$a\\\\$a', { a: '1' }), '1\\1');
}

function testNested() {
    assert.strictEqual(interp('${a.b} ${a.c} ${d}', {
        a: {
            b: '1',
            c: '2',
        },
        d: '3'
    }), '1 2 3');
}

function testFuncReplacement() {
    let cnt = 0;
    assert.strictEqual(interp('$a${a}${a:url}', (param) => {
        assert.strictEqual(param, 'a');
        return '/' + (cnt++);
    }), '/0/1%2F2');
}

function testChunks() {
    assert.deepStrictEqual(Array.from(interp.parse('foo')), ['foo']);

    assert.deepStrictEqual(Array.from(interp.parse('foo $v ${v2:lol}')), [
        'foo ',
        new interp.Placeholder('v', undefined, ''),
        ' ',
        new interp.Placeholder('v2', undefined, 'lol', 1)
    ]);
}

function testFormatValueLocalized() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };
    let date = new Date(2018, 4, 23, 21, 18, 0);
    let date2 = new Date(2018, 12, 7, 10, 30, 0);

    // date
    assert.strictEqual(interp('${v}', { v: date }, options), '5/23/2018, 9:18:00 PM');
    assert.strictEqual(interp('${v:date}', { v: date }, options), 'Wednesday, May 23, 2018');
    assert.strictEqual(interp('${v:time}', { v: date }, options), '9:18:00 PM PDT');

    // number
    assert.strictEqual(interp('${v}', { v: 3 }, options), '3');
    assert.strictEqual(interp('${v}', { v: 3.1 }, options), '3.1');
    assert.strictEqual(interp('${v}', { v: 3.12 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.123 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.1234 }, options), '3.12');

    // string & object
    assert.strictEqual(interp('${v}', { v: 'string' }, options), 'string');
    assert.strictEqual(interp('${v}', { v: {} }, options), '[object Object]');
    assert.strictEqual(interp('${v}', { v: { display: 'foo' } }, options), 'foo');

    //assert.strictEqual(formatter.measureToString(21, 0, 'C'), '21');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'C'), '21');
    assert.strictEqual(interp('${v:C} C', { v: 21 }, options), '21 C');
    assert.strictEqual(interp('${v:C} C', { v: 21.5 }, options), '21.5 C');
    //assert.strictEqual(formatter.measureToString(21, 0, 'F'), '70');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'F'), '69');
    assert.strictEqual(interp('${v:F} F', { v: 21 }, options), '69.8 F');

    assert.strictEqual(interp('${v:m}', { v: 1000 }, options), '1,000');
    assert.strictEqual(interp('${v:km}', { v: 1000 }, options), '1');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$  69.8 2018-05-24T04:18:00.000Z 42 10 9.5');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$  69.8 2018-05-24T04:18:00.000Z 42 10 9.5');

    assert.deepStrictEqual(interp('$v1 ${v1} ${v1:enum}', {
        v1: 'some_enum'
    }, options), 'some_enum some_enum some enum');

    assert.deepStrictEqual(interp('$vempty; $vsingle; $v1; ${v2:F}; ${v3}; ${v3:iso-date}; ${v4:%}', {
        vempty: [],
        vsingle: ['single'],
        v1: ['lol', 'foo', 'cat'],
        v2: [21, 42],
        v3: [date, date2],
        v4: [0.42, 0.84],
    }, options), '; single; lol, foo, and cat; 69.8 and 107.6; 5/23/2018, 9:18:00 PM and 1/7/2019, 10:30:00 AM; 2018-05-24T04:18:00.000Z and 2019-01-07T18:30:00.000Z; 42 and 84');

    assert.deepStrictEqual(interp('${v1:conjunction}; ${v2:conjunction:F}; ${v3:disjunction}; ${v3:disjunction:iso-date}; ${v4:disjunction:%}', {
        v1: ['lol', 'foo', 'cat'],
        v2: [21, 42],
        v3: [date, date2],
        v4: [0.42, 0.84, 0.85],
    }, options), 'lol, foo, and cat; 69.8 and 107.6; 5/23/2018, 9:18:00 PM or 1/7/2019, 10:30:00 AM; 2018-05-24T04:18:00.000Z or 2019-01-07T18:30:00.000Z; 42, 84, or 85');
}

function testFormatValueNonLocalized() {
    const options = {
        locale: 'C',
        timezone: 'America/Los_Angeles',
    };
    let date = new Date(2018, 4, 23, 21, 18, 0);
    let date2 = new Date(2018, 12, 7, 10, 30, 0);

    // date
    assert.strictEqual(interp('${v}', { v: date }, options), 'Wed May 23 2018 21:18:00 GMT-0700 (Pacific Daylight Time)');
    assert.strictEqual(interp('${v:date}', { v: date }, options), 'Wed May 23 2018');
    assert.strictEqual(interp('${v:time}', { v: date }, options), '21:18:00 GMT-0700 (Pacific Daylight Time)');

    // number
    assert.strictEqual(interp('${v}', { v: 3 }, options), '3');
    assert.strictEqual(interp('${v}', { v: 3.1 }, options), '3.10');
    assert.strictEqual(interp('${v}', { v: 3.12 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.123 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.1234 }, options), '3.12');

    // string & object
    assert.strictEqual(interp('${v}', { v: 'string' }, options), 'string');
    assert.strictEqual(interp('${v}', { v: {} }, options), '[object Object]');
    assert.strictEqual(interp('${v}', { v: { display: 'foo' } }, options), 'foo');

    //assert.strictEqual(formatter.measureToString(21, 0, 'C'), '21');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'C'), '21');
    assert.strictEqual(interp('${v:C} C', { v: 21 }, options), '21 C');
    assert.strictEqual(interp('${v:C} C', { v: 21.5 }, options), '21.5 C');
    //assert.strictEqual(formatter.measureToString(21, 0, 'F'), '70');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'F'), '69');
    assert.strictEqual(interp('${v:F} F', { v: 21 }, options), '69.8 F');

    assert.strictEqual(interp('${v:m}', { v: 1000 }, options), '1000');
    assert.strictEqual(interp('${v:km}', { v: 1000 }, options), '1');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$  69.8 2018-05-24T04:18:00.000Z 42 10 9.50');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$  69.8 2018-05-24T04:18:00.000Z 42 10 9.50');

    assert.deepStrictEqual(interp('$v1 ${v1} ${v1:enum}', {
        v1: 'some_enum'
    }, options), 'some_enum some_enum some enum');

    assert.deepStrictEqual(interp('$v1 ${v2:F} ${v3} ${v3:iso-date} ${v4:%}', {
        v1: ['lol', 'cat'],
        v2: [21, 42],
        v3: [date, date2],
        v4: [0.42, 0.84],
    }, options), 'lol, cat 69.8, 107.6 Wed May 23 2018 21:18:00 GMT-0700 (Pacific Daylight Time), Mon Jan 07 2019 10:30:00 GMT-0800 (Pacific Standard Time) 2018-05-24T04:18:00.000Z, 2019-01-07T18:30:00.000Z 42, 84');
}

function testLocation() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };
    class Location {
        constructor(lat, lon, display = null) {
            this.lat = lat;
            this.lon = lon;
            this.display = display;
        }

        toString() {
            return `[latitude: ${this.lat.toFixed(3)} deg, longitude: ${this.lon.toFixed(3)} deg]`;
        }

        toLocaleString() {
            if (this.display)
                return this.display;

            return `[localized latitude: ${this.lat.toFixed(3)} deg, longitude: ${this.lon.toFixed(3)} deg]`;
        }
    }

    let location = new Location(-37, 113);
    assert.strictEqual(interp('${v}', { v: location }, options), '[localized latitude: -37.000 deg, longitude: 113.000 deg]');
    assert.strictEqual(interp('${v}', { v: location }), '[latitude: -37.000 deg, longitude: 113.000 deg]');

    location = new Location(-37, 113, "Somewhere");
    assert.strictEqual(interp('${v}', { v: location }, options), 'Somewhere');
    assert.strictEqual(interp('${v}', { v: location }), '[latitude: -37.000 deg, longitude: 113.000 deg]');

    // old style lat/lon
    assert.strictEqual(interp('${v:lat} ${v:lon}', { v: location }, options), '-37 113');

    // new style lat/lon
    assert.strictEqual(interp('${v.lat} ${v.lon}', { v: location }, options), '-37 113');
}

function testPrecision() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };

    // numbers
    assert.strictEqual(interp('${v} ${v:.0} ${v:.1} ${v:.3}', { v: 0.123 }, options), '0.12 0 0.1 0.123');
    assert.strictEqual(interp('${v} ${v:.0} ${v:.1} ${v:.3}', { v: 0.12 }, options), '0.12 0 0.1 0.12');

    // percent
    assert.strictEqual(interp('${v:%} ${v:%.0} ${v:%.1} ${v:%.3}', { v: 0.123456 }, options), '12 12 12.3 12.346');

    // measure
    assert.strictEqual(interp('${v:m} ${v:m.0} ${v:m.1} ${v:m.3}', { v: 0.123 }, options), '0.1 0 0.1 0.123');
    assert.strictEqual(interp('${v:cm} ${v:cm.0} ${v:cm.1} ${v:cm.3}', { v: 0.123 }, options), '12.3 12 12.3 12.3');
}

function testNullish() {
    assert.strictEqual(interp('${a}', { a: null }), undefined);
    assert.strictEqual(interp('${a}', { a: undefined }), undefined);
    assert.strictEqual(interp('${a}', { a: NaN }), undefined);
    assert.strictEqual(interp('${a}', { a: '' }), undefined);
    assert.strictEqual(interp('${a}', { a: false }), 'false');

    assert.strictEqual(interp('${a}', { a: null }, {
        failIfMissing: false
    }), '');
    assert.strictEqual(interp('${a}', { a: null }, {
        failIfMissing: true
    }), undefined);

    assert.strictEqual(interp('${a} ${b}', { a: null, b: null }), undefined);
    assert.strictEqual(interp('${a} ${b}', { a: null, b: '' }), undefined);
    assert.strictEqual(interp('${a} ${b}', { a: null, b: '1' }), ' 1');
    assert.strictEqual(interp('${a} ${b}', { a: '1', b: '' }), '1 ');

    assert.strictEqual(interp('${a}', { a: null }, {
        nullReplacement: '____'
    }), undefined);
    assert.strictEqual(interp('${a}', { a: null }, {
        nullReplacement: '____',
        failIfMissing: false
    }), '____');

    assert.strictEqual(interp('${a} ${b}', { a: null, b: 'b' }, {
        nullReplacement: '____'
    }), '____ b');
}

function testDefault() {
    assert.strictEqual(interp('${a:-foo}', { a: null }), 'foo');
    assert.strictEqual(interp('${a:-foo}', { a: 'value' }), 'value');

    assert.strictEqual(interp('${a:.1:-foo}', { a: 1.23 }), '1.2');
    assert.strictEqual(interp('${a:.1:-foo}', { a: null }), 'foo');

    assert.strictEqual(interp('${a:-${b}}', { a: 'value', b: undefined }), 'value');
    assert.strictEqual(interp('${a:-${b}}', { a: null, b: undefined }), undefined);
    assert.strictEqual(interp('${a:-${b} foo}', { a: null, b: undefined }), undefined);
    assert.strictEqual(interp('${a:-${b} foo}', { a: null, b: undefined }, {
        failIfMissing: false
    }), '');
    assert.strictEqual(interp('${a:-${b}}', { a: null, b: '42' }), '42');
    assert.strictEqual(interp('${a:-${b} foo}', { a: null, b: '42' }), '42 foo');
    assert.strictEqual(interp('${a:-${b}\\}foo}', { a: null, b: '42' }), '42}foo');
    assert.strictEqual(interp('${a:-${b}\\}foo}', { a: '7', b: '42' }), '7');
}

function testOptional() {
    assert.strictEqual(interp('${?a:-foo}', { a: null }), 'a:-foo');
    assert.strictEqual(interp('${?${a:-foo}}', { a: null }), 'foo');
    assert.strictEqual(interp('${?${a}}', { a: null }), '');
    assert.strictEqual(interp('1${?${a} lol}2', { a: null }), '12');
    assert.strictEqual(interp('1${?${a} lol}2', { a: 'a' }), '1a lol2');
    assert.strictEqual(interp('1${?${a} lol}2', { a: null }, {
        failIfMissing: false
    }), '12');
    assert.strictEqual(interp('1${?lol}2', { a: 'a' }), '1lol2');

    assert.strictEqual(interp('1${?${a} ${b}}2', { a: null, b: 'b' }), '12');
    assert.strictEqual(interp('1${?${a} ${b}}2', { a: 'a', b: 'b' }), '1a b2');
    assert.strictEqual(interp('1${?${a} ${b}}2', { a: null, b: 'b' }, {
        failIfMissing: false
    }), '12');
}

function testPlural() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };

    assert.strictEqual(interp('${a:plural:one{one thing}other{many things}}', { a: 1 }), 'one thing');
    assert.strictEqual(interp('${a:plural:one{one thing}other{many things}}', { a: 1 }, options),
        'one thing');

    assert.strictEqual(interp('${a:plural:=1{one thing}other{many things}}', { a: 1 }), 'one thing');
    assert.strictEqual(interp('${a:plural:=1{one thing}other{many things}}', { a: 1 }, options),
        'one thing');

    assert.strictEqual(interp('${a:plural:one{one thing}other{many things}}', { a: 2 }), 'many things');
    assert.strictEqual(interp('${a:plural:one{one thing}other{many things}}', { a: 2 }, options),
        'many things');

    assert.strictEqual(interp('${a:plural:one{one thing}=2{two things}other{many things}}', { a: 2 }), 'two things');
    assert.strictEqual(interp('${a:plural:one{one thing}=2{two things}other{many things}}', { a: 2 }, options),
        'two things');

    assert.strictEqual(interp('${a:plural:one{one thing}other{}}', { a: 2 }), '');
    assert.strictEqual(interp('${a:plural:one{one thing}}', { a: 2 }), undefined);

    assert.strictEqual(interp('${' + `a:plural:
        one{one thing}
        =-1{negative one things}
        other{many things}
    }`, { a: -1 }, options), 'negative one things');
}

function testSelect() {
    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
    }`, { a: 'sunny' }), "It's nice and clear outside");

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
    }`, { a: 'rainy' }), "It's going to rain");

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
    }`, { a: 'bug' }), undefined);

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
    }`, { a: null }), undefined);

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
        null {I do not know this weather}
    }`, { a: 'bug' }), 'I do not know this weather');

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
        null {I do not know this weather}
    }`, { a: null }), 'I do not know this weather');

    assert.strictEqual(interp('${' + `a:select:
        sunny {It's nice and clear outside}
        rainy {It's going to rain}
        null {}
    }`, { a: null }), '');

    assert.strictEqual(interp('${' + `happy:select:
        true {I am happy}
        false {I am not happy}
        null {I do not know if I am happy}
    }`, { happy: true }), 'I am happy');

    assert.strictEqual(interp('${' + `happy:select:
        true {I am happy}
        false {I am not happy}
        null {I do not know if I am happy}
    }`, { happy: false }), 'I am not happy');

    assert.strictEqual(interp('${' + `happy:select:
        true {I am happy}
        false {I am not happy}
        null {I do not know if I am happy}
    }`, { happy: undefined }), 'I do not know if I am happy');

    assert.strictEqual(interp('${' + `happy:select:
        true {I am happy}
        false {I am not happy}
        null {I do not know if I am happy}
    }`, { happy: 'invalid' }), 'I do not know if I am happy');
}

function testOrdinal() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };

    const pattern = '${' + `a:ordinal:
        =1 {first thing}
        =2 {second thing}
        one {` + '${a}' + `st thing}
        two {` + '${a}' + `nd thing}
        few {` + '${a}' + `rd thing}
        other {` + '${a}' + `th thing}
    }`;

    assert.strictEqual(interp(pattern, { a: 1 }, options), 'first thing');
    assert.strictEqual(interp(pattern, { a: 2 }, options), 'second thing');
    assert.strictEqual(interp(pattern, { a: 3 }, options), '3rd thing');
    assert.strictEqual(interp(pattern, { a: 4 }, options), '4th thing');
    assert.strictEqual(interp(pattern, { a: 11 }, options), '11th thing');
    assert.strictEqual(interp(pattern, { a: 12 }, options), '12th thing');
    assert.strictEqual(interp(pattern, { a: 21 }, options), '21st thing');
    assert.strictEqual(interp(pattern, { a: 22 }, options), '22nd thing');
    assert.strictEqual(interp(pattern, { a: 23 }, options), '23rd thing');
    assert.strictEqual(interp(pattern, { a: 24 }, options), '24th thing');
    assert.strictEqual(interp(pattern, { a: '____' }, options), '____th thing');
}

function main() {
    testBasic();
    testNested();
    testFuncReplacement();
    testChunks();
    testFormatValueLocalized();
    testFormatValueNonLocalized();
    testLocation();
    testPrecision();
    testNullish();
    testDefault();
    testOptional();
    testPlural();
    testSelect();
    testOrdinal();
}
main();

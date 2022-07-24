# thingtalk-units

[![Build Status](https://travis-ci.com/stanford-oval/thingtalk-units.svg?branch=master)](https://travis-ci.org/stanford-oval/thingtalk-units) [![Coverage Status](https://coveralls.io/repos/github/stanford-oval/thingtalk-units/badge.svg?branch=master)](https://coveralls.io/github/stanford-oval/thingtalk-units?branch=master) [![Dependency Status](https://david-dm.org/stanford-oval/thingtalk-units/status.svg)](https://david-dm.org/stanford-oval/thingtalk-units) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/stanford-oval/thingtalk-units.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/stanford-oval/thingtalk-units/context:javascript)

A small library to convert and normalize between measurement units. This library
is used by the ThingTalk language to support measurements.

The library converts to and from _base units_ of various supported types, and various
additional units for each base unit.

## Usage

```javascript
const TTUnits = require('thingtalk-units');
```

## API

### function normalizeUnit(unit : String) : String

Convert a unit name to the base unit, which is a standard unit for the same property.
This method throws if the unit is invalid.
Example:

```javascript
TTUnits.normalizeUnit('F') === 'C'
TTUnits.normalizeUnit('km') === 'm'
```

### function transformToBaseUnit(value : Number, unit : String) : Number

Convert the value `value`, expressed in the unit `unit`, in the same amount in the corresponding
base unit.
Example:

```javascript
TTUnits.transformToBaseUnit(1, 'km') === 1000
```

### function transformFromBaseUnit(value : Number, unit : String) : Number

Convert the value `value`, expressed in the base unit, to the unit `unit`.
This is the inverse operation to `transformToBaseUnit()`.
Example:

```javascript
TTUnits.transformToBaseUnit(1000, 'km') === 1
```

### const BaseUnit : Array<string>

The list of the supported base units.

## Supported Units

### Base Units

* `ms`: time (milliseconds)
* `m`: distance (meters)
* `mps`: speed (meters per second)
* `kg`: mass (kilograms)
* `Pa`: pressure (Pascal)
* `C`: temperature (Celsius)
* `kcal`: energy (kilocalories)
* `byte`: data size (Byte)
* `W`: power (Watt)
* `lm`: luminous flux (lumen)
* `lx`: illuminance (lux)

The choice of base units is mostly historical. Some units follow SI convention (mps, kg, Pa),
some follow common usage (kcal, C).

### Additional Units

| Unit                              | Base Unit | Physical quantity |
| --------------------------------- | --------- | ----------------- |
| `s` (seconds)                     | `ms`      | time              |
| `min` (minutes)                   | `ms`      | time              |
| `h` (hours)                       | `ms`      | time              |
| `day` (days)                      | `ms`      | time              |
| `week` (weeks)                    | `ms`      | time              |
| `mon` (business month = 30 days)  | `ms`      | time              |
| `year` (business year = 365 days) | `ms`      | time              |
| `km` (kilometers)                 | `m`       | distance          |
| `mm` (millimeters)                | `m`       | distance          |
| `cm` (centimeters)                | `m`       | distance          |
| `mi` (miles)                      | `m`       | distance          |
| `in` (inches)                     | `m`       | distance          |
| `kmph` (kilometers per hour)      | `mps`     | speed             |
| `mph` (miles per hour)            | `mps`     | speed             |
| `g` (grams)                       | `kg`      | mass              |
| `lb` (US pound)                   | `kg`      | mass              |
| `oz` (US ounce)                   | `kg`      | mass              |
| `bar` (bar)                       | `Pa`      | pressure          |
| `psi` (pounds per square inch)    | `Pa`      | pressure          |
| `mmHg` (millimeters of mercury)   | `Pa`      | pressure          |
| `inHg` (inches of mercury)        | `Pa`      | pressure          |
| `F` (Fahrenheit)                  | `C`       | temperature       |
| `K` (Kelvin)                      | `C`       | temperature       |
| `kJ` (kilojoule)                  | `kcal`    | energy            |
| `KB` (kilobyte)                   | `byte`    | data size         |
| `KiB` (kibibyte)                  | `byte`    | data size         |
| `MB` (megabyte)                   | `byte`    | data size         |
| `MiB` (mebibyte)                  | `byte`    | data size         |
| `GB` (gigabyte)                   | `byte`    | data size         |
| `GiB` (gibibyte)                  | `byte`    | data size         |
| `TB` (terabyte)                   | `byte`    | data size         |
| `TiB` (tebibyte)                  | `byte`    | data size         |
| `kW` (kilowatt)                   | `W`       | power             |

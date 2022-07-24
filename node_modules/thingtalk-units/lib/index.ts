// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

export const BaseUnits = ['ms', 'm', 'm2', 'm3', 'mps', 'kg', 'Pa', 'C', 'kcal', 'byte', 'W', 'lm', 'lx', 'dB', 'dBm'];

const UnitsToBaseUnit : { [key : string]: string } = {
    // time
    'ms': 'ms', // base unit for time is milliseconds, because +new Date gives milliseconds
    's': 'ms',
    'min': 'ms',
    'h': 'ms',
    'day': 'ms',
    'week': 'ms',
    'mon': 'ms', // business month, aka exactly 30 days
    'year': 'ms', // business year (365 days exactly, no leap years)
    // length
    'm': 'm',
    'km': 'm',
    'mm': 'm',
    'cm': 'm',
    'mi': 'm',
    'in': 'm',
    'ft': 'm',
    // area
    'm2': 'm2',
    'km2': 'm2',
    'mm2': 'm2',
    'cm2': 'm2',
    'mi2': 'm2',
    'in2': 'm2',
    'ft2': 'm2',
    // volume
    'm3': 'm3',
    'km3': 'm3',
    'mm3': 'm3',
    'cm3': 'm3',
    'mi3': 'm3',
    'in3': 'm3',
    'ft3': 'm3',
    'gal': 'm3',
    'galuk': 'm3',
    'qt': 'm3',
    'qtuk': 'm3',
    'pint': 'm3',
    'pintuk': 'm3',
    'l': 'm3',
    'hl': 'm3',
    'cl': 'm3',
    'ml': 'm3',
    'tsp': 'm3',
    'tbsp': 'm3',
    'cup': 'm3',
    'floz': 'm3',
    // speed
    'mps': 'mps', // meters per second, usually written as m/s but m/s is not an identifier
    'kmph': 'mps',
    'mph': 'mps',
    // weight
    'kg': 'kg',
    'g': 'kg',
    'mg': 'kg',
    'lb': 'kg',
    'oz': 'kg',
    // pressure (for weather or blood)
    'Pa': 'Pa',
    'bar': 'Pa',
    'psi': 'Pa',
    'mmHg': 'Pa',
    'inHg': 'Pa',
    'atm': 'Pa',
    // temperature
    'C': 'C',
    'F': 'C',
    'K': 'C',
    // energy
    'kcal': 'kcal',
    'kJ': 'kcal',
    // file and memory sizes
    'byte': 'byte',
    'KB': 'byte',
    'KiB': 'byte',
    'MB': 'byte',
    'MiB': 'byte',
    'GB': 'byte',
    'GiB': 'byte',
    'TB': 'byte',
    'TiB': 'byte',
    // power
    'W': 'W',
    'kW': 'W',
    // luminous flux, luminous power
    'lm': 'lm',
    // luminous emittance (luminous flux emitted from a surface)
    'lx': 'lx',
    // decibel
    'dB': 'dB',
    // decibel-milliwatts
    'dBm': 'dBm'
};

const UnitsTransformToBaseUnit : { [key : string] : (number|((x : number) => number)) } = {
    'ms': 1,
    's': 1000,
    'min': 60 * 1000,
    'h': 3600 * 1000,
    'day': 86400 * 1000,
    'week': 86400 * 7 * 1000,
    'mon': 86400 * 30 * 1000,
    'year': 86400 * 365 * 1000,
    'm': 1,
    'km': 1000,
    'mm': 1/1000,
    'cm': 1/100,
    'mi': 1609.344,
    'in': 0.0254,
    'ft': 0.3048,
    'm2': 1,
    'km2': 1000 * 1000,
    'mm2': 1/1000/1000,
    'cm2': 1/100/100,
    'mi2': 1609.344 * 1609.344,
    'in2': 0.0254 * 0.0254,
    'ft2': 0.3048 * 0.3048,
    'm3': 1,
    'km3': 1000 * 1000 * 1000,
    'mm3': 1/1000/1000/1000,
    'cm3': 1/100/100/100,
    'mi3': 1609.344 * 1609.344 * 1609.344,
    'in3': 0.0254 * 0.0254 * 0.0254,
    'ft3': 0.3048 * 0.3048 * 0.3048,
    'gal': 0.00378541,
    'galuk': 0.00454609,
    'qt': 0.000946353,
    'qtuk': 0.00113652,
    'pint': 0.000473176,
    'pintuk': 0.000568261,
    'l': 0.001,
    'hl': 0.1,
    'cl': 0.00001,
    'ml': 0.000001,
    'tsp': 0.00000492892,
    'tbsp': 0.0000147868,
    'cup': 0.000236588,
    'floz': 0.0000295735,
    'mps': 1,
    'kmph': 0.27777778,
    'mph': 0.44704,
    'kg': 1,
    'g': 1/1000,
    'mg': 1e-6,
    'lb': 0.45359237,
    'oz': 0.028349523,
    'Pa': 1,
    'bar': 100000,
    'psi': 6894.7573,
    'mmHg': 133.32239,
    'inHg': 3386.3886,
    'atm': 101325,
    'C': 1,
    'F': function(x) { return (x - 32)/1.8; },
    'K': function(x) { return x - 273.15; },
    'kcal': 1,
    'kJ': 0.239006,
    'byte': 1,
    'KB': 1000,
    'KiB': 1024,
    'MB': 1000*1000,
    'MiB': 1024*1024,
    'GB': 1000*1000*1000,
    'GiB': 1024*1024*1024,
    'TB': 1000*1000*1000*1000,
    'TiB': 1024*1024*1024*1024,
    'W': 1,
    'kW': 1000,
    'lm': 1,
    'lx': 1,
    'dB': 1,
    'dBm': 1
};

const UnitsInverseTransformFromBaseUnit : { [key : string] : ((x : number) => number) } = {
    'F': function(x) { return x*1.8 + 32; },
    'K': function(x) { return x + 273.15; }
};

export function transformToBaseUnit(value : number, unit : string) : number {
    const transform = UnitsTransformToBaseUnit[unit];
    if (typeof transform === 'function')
        return transform(value);
    else
        return value * transform;
}

export function transformFromBaseUnit(value : number, unit : string) : number {
    const coeff = UnitsTransformToBaseUnit[unit];
    if (typeof coeff === 'function')
        return UnitsInverseTransformFromBaseUnit[unit](value);
    else
        return ((1/coeff)*value);
}

export function normalizeUnit(unit : string) : string {
    if (unit === '')
        return '';
    const baseunit = UnitsToBaseUnit[unit];
    if (baseunit === undefined)
        throw new TypeError('Invalid unit ' + unit);
    return baseunit;
}

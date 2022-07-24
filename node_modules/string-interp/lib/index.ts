// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

import * as TTUnits from 'thingtalk-units';

import { Placeholder, Optional, Plural, Select, Expansion } from './ast';

import Formatter, { EnumFormatter } from './formatter';
import * as parser from './grammar';
import { get, } from './utils';

function parse(string : string) : Expansion {
    return parser.parse(string);
}

const ALLOWED_OPTIONS = new Set(['%', 'iso-date', 'date', 'time', 'url', 'enum', 'lat', 'lon']);

interface InterpolationOptions {
    locale ?: string;
    timezone ?: string;
    formatEnum ?: EnumFormatter;
    failIfMissing ?: boolean;
    nullReplacement ?: string;
}

function typecheck(parsed : Expansion) {
    for (const chunk of parsed) {
        if (typeof chunk === 'string')
            continue;

        if (chunk instanceof Placeholder) {
            if (chunk.default)
                typecheck(chunk.default);
            if (chunk.option === '')
                continue;
            if (ALLOWED_OPTIONS.has(chunk.option))
                continue;

            // everything else is treated as a unit
            TTUnits.normalizeUnit(chunk.option);
        }

        if (chunk instanceof Optional)
            typecheck(chunk.pattern);

        if (chunk instanceof Select || chunk instanceof Plural) {
            for (const variant of chunk.variants.values())
                typecheck(variant);
        }
    }
}

function isNullish(value : unknown) : boolean {
    return value === undefined || value === null || value === '' ||
        Number.isNaN(value) || (value instanceof Date && Number.isNaN(+value));
}

type ArgFunction = (x : string) => unknown;
type ArgMap = ({ [key : string] : unknown });
type ArgsType = ArgFunction | ArgMap;

function replace(formatter : Formatter,
                 parsed : Expansion,
                 args : ArgsType,
                 failIfAllMissing : boolean,
                 failIfAnyMissing : boolean,
                 nullReplacement : string) : string|undefined {
    let buffer = '';
    let anyFailed = false;
    let allFailed = true;

    for (const chunk of parsed) {
        if (typeof chunk === 'string') {
            buffer += chunk;
            continue;
        }

        if (chunk instanceof Select) {
            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);

            let variant;
            if (isNullish(value))
                variant = chunk.variants.get('null');
            else if (chunk.variants.has(String(value)))
                variant = chunk.variants.get(String(value));
            else
                variant = chunk.variants.get('null');

            let replacement;
            if (variant)
                replacement = replace(formatter, variant, args, failIfAnyMissing, false, nullReplacement);
            if (replacement === undefined) {
                anyFailed = true;
                continue;
            }
            buffer += replacement;
            allFailed = false;
        }

        if (chunk instanceof Plural) {
            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);
            let variant;
            if (typeof value !== 'number' || isNullish(value))
                variant = chunk.variants.get('other');
            else if (chunk.variants.has(value))
                variant = chunk.variants.get(value);
            else
                variant = chunk.variants.get(formatter.getPluralType(value, chunk.type));

            let replacement;
            if (variant)
                replacement = replace(formatter, variant, args, failIfAnyMissing, false, nullReplacement);
            if (replacement === undefined) {
                anyFailed = true;
                continue;
            }
            buffer += replacement;
            allFailed = false;
        }

        if (chunk instanceof Placeholder) {
            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);
            if (isNullish(value)) {
                if (chunk.default) {
                    const replacement = replace(formatter, chunk.default, args, true, false, nullReplacement);
                    if (replacement !== undefined) {
                        allFailed = false;
                        buffer += replacement;
                    } else {
                        anyFailed = true;
                        buffer += nullReplacement;
                    }
                } else {
                    anyFailed = true;
                    buffer += nullReplacement;
                }
            } else {
                buffer += formatter.formatValue(value, chunk);
                allFailed = false;
            }
        }

        if (chunk instanceof Optional) {
            const replacement = replace(formatter, chunk.pattern, args, true, true, nullReplacement);
            if (replacement === undefined)
                continue;
            buffer += replacement;
        }
    }
    if (failIfAnyMissing && anyFailed)
        return undefined;
    // note that "allFailed" will be true if there are no placeholders, hence we check "anyFailed" too
    if (failIfAllMissing && anyFailed && allFailed)
        return undefined;

    return buffer;
}

function compile(string : string, options : InterpolationOptions = {}) : ((x : ArgsType) => string|undefined) {
    const parsed : Expansion = parse(string);
    typecheck(parsed);
    const failIfMissing = options.failIfMissing === undefined ? true : options.failIfMissing;
    const nullReplacement = options.nullReplacement || '';
    const formatter = new Formatter(options.locale || 'C', options.timezone, options.formatEnum);

    return function(args : ArgsType) {
        return replace(formatter, parsed, args, failIfMissing, false, nullReplacement);
    };
}

export default function interpolate(string : string, args : ArgsType, options ?: InterpolationOptions) : string|undefined {
    return compile(string, options)(args);
}
interpolate.default = interpolate;
interpolate.parse = parse;
interpolate.compile = compile;
interpolate.Formatter = Formatter;
interpolate.Placeholder = Placeholder;
interpolate.Optional = Optional;
interpolate.Plural = Plural;
interpolate.Select = Select;
module.exports = interpolate;

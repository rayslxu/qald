// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

{
    const { Optional, Placeholder, Plural, Select } = require('./ast');

    function take(array, idx) {
        return array.map(function(v) { return v[idx]; });
    }
}

pattern = [{}] / pattern_no_brace

pattern_no_brace = ($([^\\${}]+) / escape / raw_param / optional_part / plural_clause / select_clause / wrapped_param)*

escape = '$$' {
    return '$';
} / '\\' ch:. {
    return ch;
}
//

raw_param = '$' ident:identifier {
    return new Placeholder(ident);
}

optional_part = '${?' nested:pattern_no_brace '}' {
    return new Optional(nested);
}

plural_clause = '${' __ param:qualified_name __ ':' __ keyword:('plural' / 'ordinal') __ ':' variants:plural_variant+ '}' {
    const variantmap = new Map;
    for (let [type, expansion] of variants) {
        if (variantmap.has(type)) {
            error(`Duplicate plural variant ${type}`);
            return;
        }
        variantmap.set(type, expansion);
    }
    return new Plural(param, keyword === 'plural' ? 'cardinal' : keyword, variantmap);
}

select_clause = '${' __ param:qualified_name __ ':' __ 'select' __ ':' variants:select_variant+
'}' {
    const variantmap = new Map;
    for (let [type, expansion] of variants) {
        if (variantmap.has(type)) {
            error(`Duplicate select variant ${type}`);
            return;
        }
        variantmap.set(type, expansion);
    }
    return new Select(param, variantmap);
}

plural_variant = __ type:plural_type __ '{' expansion:pattern_no_brace '}' __ {
    return [type, expansion];
}

plural_type = '=' neg:'-'? int:integer_literal { return (neg ? -1 : 1) * int; }
    / 'zero' / 'one' / 'two' / 'few' / 'many' / 'other'

select_variant = __ type:identifier __ '{' expansion:pattern_no_brace '}' __ {
    return [type, expansion];
}

wrapped_param = '${' __ param:qualified_name __ array_opt:(':' __ ('conjunction' / 'disjunction') __)? opt:option_clause? __ _default:(':-' pattern_no_brace)? '}' {
    if (opt)
        return new Placeholder(param, array_opt ? array_opt[2] : undefined, ...opt, _default ? _default[1] : null);
    else
        return new Placeholder(param, array_opt ? array_opt[2] : undefined, undefined, undefined, _default ? _default[1] : null);
}

option_clause = ':' __ opt:option? '.' precision:integer_literal {
    return [opt || '', precision];
} / ':' __ opt:option {
    return [opt, opt === '%' ? 0 : 1];
}
//

qualified_name = first:identifier __ rest:('.' __ identifier __)* {
    return [first, ...take(rest, 2)].join('.');
}

option "option" = '%' / $(identstart optidentchar*)
identifier "identifier" = $(identstart identchar*)

identstart = [A-Za-z_]
identchar = [A-Za-z0-9_]
optidentchar = [A-Za-z-]

integer_literal "integer" = v:$([0-9]) {
    return parseInt(v, 10);
}

__ "whitespace" = [ \r\n\t\v]*

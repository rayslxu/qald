// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

type ListFormatType = ('conjunction' | 'disjunction');

export class Placeholder {
    'default' : Expansion|null;
    constructor(public param : string,
                public arraystyle : ListFormatType|undefined,
                public option : string = '',
                public precision = 2,
                _default : Expansion|null = null) {
        this.default = _default;
    }
}

export class Optional {
    constructor(public pattern : Expansion) {
    }
}

export class Plural {
    constructor(public param : string,
                public type : Intl.PluralRuleType,
                public variants : Map<string|number, Expansion>) {
    }
}

export class Select {
    constructor(public param : string,
                public variants : Map<string, Expansion>) {
    }
}

export type Chunk = string | Placeholder | Optional | Plural | Select;
export type Expansion = Chunk[];

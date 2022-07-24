// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

export function get(obj : any, propchain : string) : any {
    for (const prop of propchain.split('.'))
        obj = obj[prop];
    return obj;
}
export function clean(name : string) : string {
    if (/^[vwgp]_/.test(name))
        name = name.substr(2);
    return name.replace(/_/g, ' ').replace(/([^A-Z ])([A-Z])/g, '$1 $2').toLowerCase();
}

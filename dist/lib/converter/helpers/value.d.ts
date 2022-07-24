import { Ast, Type } from "thingtalk";
import SPARQLToThingTalkConverter from '../sparql2thingtalk';
export interface ValueConverterOptions {
    prefix?: string;
}
export default class ValueConverter {
    private _converter;
    private _prefix;
    constructor(converter: SPARQLToThingTalkConverter, options?: ValueConverterOptions);
    private _getEntityDisplay;
    private _getMeasure;
    private _toThingTalkDate;
    toThingTalkValue(value: any, type: Type): Promise<Ast.Value>;
}

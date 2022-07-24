import { Ast } from 'thingtalk';
import ConverterHelper from './helpers';
import WikidataUtils from '../utils/wikidata';
import { WikiSchema as WikidataSchema } from '../schema';
export interface Projection {
    property: string | Ast.PropertyPathSequence | Ast.FilterValue | Ast.ArrayFieldValue;
    variable?: string;
    type?: string;
}
export interface Aggregation {
    op: string;
    variable: string;
}
export interface Comparison {
    lhs: string;
    operator: string;
    rhs: string;
}
export interface Predicate {
    table?: string;
    property?: string;
    op?: string;
    isVariable?: boolean;
    value?: string;
    predicate_variable?: string;
    qualifiers: Qualifier[];
}
export interface Qualifier {
    property: string;
    op: string;
    value: string;
    isVariable: boolean;
}
export interface Table {
    name: string;
    projections: Projection[];
    filters: Ast.BooleanExpression[];
}
interface SPARQLToThingTalkConverterOptions {
    cache: string;
    bootleg_db: string;
}
export default class SPARQLToThingTalkConverter {
    private _sparqlParser;
    private _class;
    private _schema;
    private _kb;
    private _helper;
    private _tokenizer;
    private _utterance?;
    private _sparql?;
    private _keywords;
    private _tables;
    private _crossTableComparison;
    private _parser;
    private _generator;
    constructor(classDef: Ast.ClassDef, options: SPARQLToThingTalkConverterOptions);
    get class(): Ast.ClassDef;
    get kb(): WikidataUtils;
    get schema(): WikidataSchema;
    get helper(): ConverterHelper;
    get tables(): Record<string, Table>;
    get comparison(): Comparison[];
    get keywords(): string[];
    get sparql(): string | undefined;
    get utterance(): string | undefined;
    updateTable(subject: string, update: Ast.BooleanExpression | Projection | string): void;
    removeTable(subject: string): void;
    removeProjection(subject: string, variable: string): void;
    addCrossTableComparison(comp: Comparison): void;
    private _init;
    convert(sparql: string, utterance: string): Promise<Ast.Program>;
}
export {};

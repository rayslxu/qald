import { BgpPattern } from 'sparqljs';
import { Ast } from 'thingtalk';
import { ArrayCollection } from '../../utils/misc';
import SPARQLToThingTalkConverter from "../sparql2thingtalk";
export default class TripleParser {
    private _converter;
    constructor(converter: SPARQLToThingTalkConverter);
    /**
     * Convert a basic triple to ThingTalk filter
     * @param triple a parsed Triple for SPARQL
     * @returns the subject and the ThingTalk filter
     */
    private _parseBasicTriple;
    private _parseSequencePathTriple;
    parse(pattern: BgpPattern): Promise<ArrayCollection<Ast.BooleanExpression>>;
}

import { Ast } from 'thingtalk';
import { FilterPattern } from 'sparqljs';
import { ArrayCollection } from '../../utils/misc';
import SPARQLToThingTalkConverter from '../sparql2thingtalk';
export default class FilterParser {
    private _converter;
    constructor(converter: SPARQLToThingTalkConverter);
    private _parseFilter;
    private _findProperty;
    /**
     * Parse a filter expression where the operation is a unary operation
     * @param expression a filter expression
     * @param negate if the filter should be negated
     */
    private _parseUnaryOperation;
    /**
     * Parse a filter expression where the operation is a binary operation
     * @param expression a filter expression
     * @param negate if the filter should be negated
     */
    private _parseBinaryOperation;
    parse(filter: FilterPattern): Promise<ArrayCollection<Ast.BooleanExpression>>;
}

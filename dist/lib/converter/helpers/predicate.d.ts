import { Triple } from 'sparqljs';
import { Predicate } from '../sparql2thingtalk';
import SPARQLToThingTalkConverter from '../sparql2thingtalk';
import { Ast } from 'thingtalk';
import { ArrayCollection } from '../../utils/misc';
export default class PredicateParser {
    private _converter;
    private _predicates;
    constructor(converter: SPARQLToThingTalkConverter);
    get predicates(): Predicate[];
    reset(): void;
    private _findMatchingPredicate;
    addOrUpdatePredicate(predicate: Predicate): void;
    parse(triple: Triple): Promise<void>;
    _hasFieldProjection(table: string, property: string): boolean;
    _getAndDeleteFieldProjection(table: string, property: string): (string | undefined)[] | null;
    _convertPredicate(predicate: Predicate): Promise<ArrayCollection<Ast.BooleanExpression>>;
    convert(): Promise<ArrayCollection<Ast.BooleanExpression>>;
}

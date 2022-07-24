import { Ast, Type } from 'thingtalk';
import { BgpPattern, Expression, Grouping, FilterPattern, UnionPattern, Variable, Wildcard, Ordering, SelectQuery, AskQuery, Triple } from 'sparqljs';
import { ArrayCollection } from '../../utils/misc';
import { Table, Aggregation, Projection, Predicate } from '../sparql2thingtalk';
import SPARQLToThingTalkConverter from '../sparql2thingtalk';
export default class ConverterHelper {
    private _converter;
    private _triple;
    private _filter;
    private _group;
    private _predicate;
    private _value;
    constructor(converter: SPARQLToThingTalkConverter);
    get predicates(): Predicate[];
    init(): void;
    convertValue(value: any, type: Type): Promise<Ast.Value>;
    convertPredicates(): Promise<ArrayCollection<Ast.BooleanExpression>>;
    parseGroup(having: Expression, group: Grouping): Promise<void>;
    parsePredicate(predicate: Triple): Promise<void>;
    parseTriples(clause: BgpPattern): Promise<ArrayCollection<Ast.BooleanExpression>>;
    parseFilter(clause: FilterPattern): Promise<ArrayCollection<Ast.BooleanExpression>>;
    parseUnion(clause: UnionPattern): Promise<ArrayCollection<Ast.BooleanExpression>>;
    parseVariables(variables: Variable[] | [Wildcard]): ArrayCollection<Projection | Aggregation>;
    updatePredicate(predicate: Predicate): void;
    addFilters(base: Ast.Expression, filters: Ast.BooleanExpression[]): Ast.Expression;
    addProjectionsAndAggregations(base: Ast.Expression, subject: string, projectionsAndAggregations: Array<Projection | Aggregation>): Ast.Expression;
    addOrdering(base: Ast.Expression, table: Table, ordering?: Ordering[]): Ast.Expression;
    addLimit(base: Ast.Expression, limit?: number): Ast.Expression;
    addVerification(base: Ast.Expression, filters: Ast.BooleanExpression[], projections: Projection[]): Ast.Expression;
    /**
     * Preprocess tables to simplify the conversion
     */
    preprocessTables(projectionsAndAggregationsBySubject: ArrayCollection<Projection | Aggregation>): Promise<void>;
    /**
     * Find the main subject among tables, which will be the main function
     * for ThingTalk, other tables will be added as subqueries
     * @param queryType the type of the query
     */
    getMainSubject(query: SelectQuery | AskQuery): string;
    makeSubquery(mainSubject: string, subquerySubject: string): Ast.BooleanExpression;
    makeAtomBooleanExpression(property: string, value: any, operator?: string, valueType?: Type): Promise<Ast.AtomBooleanExpression>;
}

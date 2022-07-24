"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const thingtalk_1 = require("thingtalk");
const sparqljs_typeguard_1 = require("../../utils/sparqljs-typeguard");
const wikidata_1 = require("../../utils/wikidata");
const thingtalk_2 = require("../../utils/thingtalk");
const misc_1 = require("../../utils/misc");
const sparqljs_1 = require("../../utils/sparqljs");
const triple_1 = __importDefault(require("./triple"));
const filter_1 = __importDefault(require("./filter"));
const predicate_1 = __importDefault(require("./predicate"));
const value_1 = __importDefault(require("./value"));
const group_1 = __importDefault(require("./group"));
function isAggregation(v) {
    return typeof v === 'object' && 'op' in v && 'variable' in v;
}
class ConverterHelper {
    constructor(converter) {
        this._converter = converter;
        this._triple = new triple_1.default(converter);
        this._filter = new filter_1.default(converter);
        this._predicate = new predicate_1.default(converter);
        this._value = new value_1.default(converter);
        this._group = new group_1.default(converter);
    }
    get predicates() {
        return this._predicate.predicates;
    }
    init() {
        this._predicate.reset();
    }
    async convertValue(value, type) {
        return this._value.toThingTalkValue(value, type);
    }
    async convertPredicates() {
        return this._predicate.convert();
    }
    async parseGroup(having, group) {
        return this._group.parse(having, group);
    }
    async parsePredicate(predicate) {
        return this._predicate.parse(predicate);
    }
    async parseTriples(clause) {
        return this._triple.parse(clause);
    }
    async parseFilter(clause) {
        return this._filter.parse(clause);
    }
    async parseUnion(clause) {
        const triple = (0, sparqljs_1.parseSpecialUnion)(clause);
        if (triple)
            return this.parseTriples({ type: 'bgp', triples: [triple] });
        const results = [];
        for (const pattern of clause.patterns) {
            (0, assert_1.default)((0, sparqljs_typeguard_1.isBasicGraphPattern)(pattern));
            results.push(await this.parseTriples(pattern));
        }
        let existedSubject = null;
        const operands = [];
        for (const filtersBySubject of results) {
            if (filtersBySubject.size > 1)
                throw new Error('Unsupported: multiple subjects in a union');
            const subject = filtersBySubject.keys[0];
            const filters = filtersBySubject.get(subject);
            (0, assert_1.default)(filters.length > 0);
            const filter = filters.length === 1 ? filters[0] : new thingtalk_1.Ast.AndBooleanExpression(null, filters);
            if (!existedSubject)
                existedSubject = subject;
            else if (subject !== existedSubject)
                throw new Error('Unsupported: multiple subjects in a union');
            operands.push(filter);
        }
        return new misc_1.ArrayCollection(existedSubject, new thingtalk_1.Ast.OrBooleanExpression(null, operands));
    }
    parseVariables(variables) {
        const projectionsOrAggregationsBySubject = new misc_1.ArrayCollection();
        for (const variable of variables) {
            if ((0, sparqljs_typeguard_1.isVariable)(variable)) {
                for (const [subject, table] of Object.entries(this._converter.tables)) {
                    if (subject === variable.value) {
                        projectionsOrAggregationsBySubject.add(subject, {
                            property: 'id',
                            variable: variable.value
                        });
                    }
                    for (const projection of table.projections) {
                        if (projection.variable === variable.value) {
                            projectionsOrAggregationsBySubject.add(subject, {
                                property: projection.property,
                                variable: variable.value
                            });
                        }
                    }
                }
            }
            else if ((0, sparqljs_typeguard_1.isVariableExpression)(variable) && (0, sparqljs_typeguard_1.isAggregateExpression)(variable.expression)) {
                (0, assert_1.default)(['count', 'sum', 'avg', 'min', 'max'].includes(variable.expression.aggregation));
                const expression = variable.expression.expression;
                (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(expression));
                for (const [subject, table] of Object.entries(this._converter.tables)) {
                    if (subject === expression.value) {
                        projectionsOrAggregationsBySubject.add(subject, {
                            op: variable.expression.aggregation,
                            variable: expression.value
                        });
                    }
                    for (const projection of table.projections) {
                        if (projection.variable === expression.value) {
                            projectionsOrAggregationsBySubject.add(subject, {
                                op: variable.expression.aggregation,
                                variable: projection.property
                            });
                        }
                    }
                }
            }
            else {
                throw new Error('Unsupported type of variable: ' + variable);
            }
        }
        return projectionsOrAggregationsBySubject;
    }
    updatePredicate(predicate) {
        this._predicate.addOrUpdatePredicate(predicate);
    }
    addFilters(base, filters) {
        if (filters.length === 0)
            return base;
        const filter = filters.length > 1 ? new thingtalk_1.Ast.AndBooleanExpression(null, filters) : filters[0];
        return new thingtalk_1.Ast.FilterExpression(null, base, filter, null);
    }
    addProjectionsAndAggregations(base, subject, projectionsAndAggregations) {
        const projections = projectionsAndAggregations.filter((v) => !isAggregation(v));
        const aggregations = projectionsAndAggregations.filter(isAggregation);
        let expression = base;
        if (projections.length > 0 && !(projections.length === 1 && projections[0].property === 'id')) {
            expression = new thingtalk_1.Ast.ProjectionExpression2(null, expression, projections.map((p) => new thingtalk_1.Ast.ProjectionElement(p.property, null, p.type ? [new thingtalk_1.Type.Entity(`org.wikidata:${p.type}`)] : [])), null);
        }
        if (aggregations.length > 0) {
            (0, assert_1.default)(aggregations.length === 1);
            const aggregation = aggregations[0];
            const field = aggregation.variable === subject ? '*' : aggregation.variable;
            expression = new thingtalk_1.Ast.AggregationExpression(null, expression, field, aggregation.op, null);
        }
        return expression;
    }
    addOrdering(base, table, ordering) {
        if (!ordering || ordering.length === 0)
            return base;
        if (ordering.length > 1)
            throw new Error('Unsupported: ordering on multiple varialbles');
        const order = ordering[0];
        const expression = order.expression;
        (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(expression));
        const projection = table.projections.find((proj) => proj.variable === expression.value);
        if (!projection)
            throw new Error('Failed to find the variable for sorting');
        if (typeof projection.property !== 'string')
            throw new Error('Unsupported: sort on property path');
        const property = new thingtalk_1.Ast.Value.VarRef(projection.property);
        const direction = order.descending ? 'desc' : 'asc';
        return new thingtalk_1.Ast.SortExpression(null, base, property, direction, null);
    }
    addLimit(base, limit) {
        if (limit)
            return new thingtalk_1.Ast.IndexExpression(null, base, [new thingtalk_1.Ast.Value.Number(limit)], null);
        return base;
    }
    addVerification(base, filters, projections) {
        let idFilter = null;
        const operands = [];
        // add filters that is not an id filter
        for (const filter of filters) {
            if ((0, thingtalk_2.isIdFilter)(filter))
                idFilter = filter;
            else
                operands.push(filter);
        }
        // for projections, add filter that the property is not null
        for (const proj of projections) {
            let isNull;
            if (typeof proj.property === 'string') {
                if (proj.property.endsWith('Label'))
                    continue;
                // if there is other tables for the projection, 
                // do not create a is null verification, a subquery is needed
                if (proj.variable && proj.variable in this._converter.tables)
                    continue;
                // if there is other filters for the projection
                // do not create a is null verification
                const inFilter = operands.some((f) => {
                    if (f instanceof thingtalk_1.Ast.AtomBooleanExpression && f.name === proj.property)
                        return true;
                    if ((f instanceof thingtalk_1.Ast.ComputeBooleanExpression || f instanceof thingtalk_1.Ast.ComparisonSubqueryBooleanExpression) &&
                        f.lhs instanceof thingtalk_1.Ast.VarRefValue &&
                        f.lhs.name === proj.property)
                        return true;
                    return false;
                });
                if (inFilter)
                    continue;
                const propertyType = this._converter.schema.getPropertyType(proj.property);
                if (propertyType instanceof thingtalk_1.Type.Array) {
                    isNull = new thingtalk_1.Ast.ComputeBooleanExpression(null, new thingtalk_1.Ast.Value.Computation('count', [new thingtalk_1.Ast.Value.VarRef(proj.property)]), '==', new thingtalk_1.Ast.Value.Number(0));
                }
                else {
                    isNull = new thingtalk_1.Ast.AtomBooleanExpression(null, proj.property, '==', new thingtalk_1.Ast.Value.Null, null);
                }
            }
            else if (proj.property instanceof thingtalk_1.Ast.FilterValue || proj.property instanceof thingtalk_1.Ast.ArrayFieldValue) {
                isNull = new thingtalk_1.Ast.ComputeBooleanExpression(null, proj.property, '==', new thingtalk_1.Ast.Value.Null, null);
            }
            else {
                isNull = new thingtalk_1.Ast.PropertyPathBooleanExpression(null, proj.property, '==', new thingtalk_1.Ast.Value.Null, null);
            }
            operands.push(new thingtalk_1.Ast.NotBooleanExpression(null, isNull));
        }
        if (idFilter) {
            base = new thingtalk_1.Ast.FilterExpression(null, base, idFilter, null);
            const verification = operands.length > 1 ? new thingtalk_1.Ast.AndBooleanExpression(null, operands) : operands[0];
            return new thingtalk_1.Ast.BooleanQuestionExpression(null, base, verification, null);
        }
        else {
            const filterdTable = this.addFilters(base, operands);
            const aggregatedTable = new thingtalk_1.Ast.AggregationExpression(null, filterdTable, '*', 'count', null);
            return new thingtalk_1.Ast.BooleanQuestionExpression(null, aggregatedTable, new thingtalk_1.Ast.AtomBooleanExpression(null, 'count', '>=', new thingtalk_1.Ast.Value.Number(1), null), null);
        }
    }
    /**
     * Preprocess tables to simplify the conversion
     */
    async preprocessTables(projectionsAndAggregationsBySubject) {
        // check tables with only domain information, it can potentially be resolved with a type annotation
        // on another table's projection
        // only apply to selection not verification
        for (const [subject, table] of Object.entries(this._converter.tables)) {
            if (subject.startsWith(wikidata_1.ENTITY_PREFIX))
                continue;
            if (table.name !== 'entity' && table.filters.length === 0 && table.projections.length === 0) {
                let domain = table.name;
                if (this._converter.kb.isEntity(table.name))
                    domain = (0, misc_1.cleanName)((await this._converter.kb.getLabel(table.name)));
                let isProjected = false;
                for (const [subject2,] of projectionsAndAggregationsBySubject.iterate()) {
                    if (subject === subject2)
                        continue;
                    const projectionsAndAggregations = projectionsAndAggregationsBySubject.get(subject2);
                    const proj = projectionsAndAggregations.find((p) => !isAggregation(p) && p.variable === subject);
                    if (proj) {
                        isProjected = true;
                        proj.type = domain;
                    }
                }
                if (isProjected)
                    this._converter.removeTable(subject);
            }
        }
        // if a table name is QID, it means its domain is not in the schema, we need to add a instance_of filter
        for (const table of Object.values(this._converter.tables)) {
            const subdomain = table.name;
            if (!this._converter.kb.isEntity(table.name))
                continue;
            const domain = await this._converter.kb.getTopLevelDomain([subdomain]);
            table.name = this._converter.schema.getTable(domain);
            const value = await this._converter.helper.convertValue(wikidata_1.ENTITY_PREFIX + subdomain, new thingtalk_1.Type.Entity(`org.wikidata:${table.name}_subdomain`));
            table.filters.unshift(new thingtalk_1.Ast.AtomBooleanExpression(null, 'instance_of', '==', value, null));
        }
        // if there is property not available in the domain, use 'entity' domain 
        for (const table of Object.values(this._converter.tables)) {
            const properties = [];
            for (const filter of table.filters)
                properties.push(...(0, thingtalk_2.getPropertiesInFilter)(filter));
            for (const proj of table.projections) {
                const prop = proj.property;
                if (typeof prop === 'string') {
                    if (prop.endsWith('Label'))
                        continue;
                    if (prop.includes('.'))
                        continue;
                    properties.push(prop);
                }
                else if (prop instanceof thingtalk_1.Ast.FilterValue) {
                    properties.push(prop.value.name);
                }
                else if (prop instanceof thingtalk_1.Ast.ArrayFieldValue) {
                    const filterValue = prop.value;
                    properties.push(filterValue.value.name);
                }
                else {
                    properties.push(prop[0].property);
                }
            }
            const query = this._converter.class.getFunction('query', table.name);
            if (properties.some((prop) => !query.args.includes(prop))) {
                table.name = 'entity';
                if (table.filters.some((f) => f instanceof thingtalk_1.Ast.AtomBooleanExpression && f.name === 'instance_of'))
                    continue;
                const idFilter = table.filters.find((f) => f instanceof thingtalk_1.Ast.AtomBooleanExpression && f.name === 'id');
                if (idFilter) {
                    const value = idFilter.value;
                    value.type = 'org.wikidata:entity';
                    continue;
                }
                const qid = query.getImplementationAnnotation('wikidata_subject');
                const value = await this._converter.helper.convertValue(wikidata_1.ENTITY_PREFIX + qid, new thingtalk_1.Type.Entity(`org.wikidata:entity_subdomain`));
                table.filters.push(new thingtalk_1.Ast.AtomBooleanExpression(null, 'instance_of', '==', value, null));
            }
        }
    }
    /**
     * Find the main subject among tables, which will be the main function
     * for ThingTalk, other tables will be added as subqueries
     * @param queryType the type of the query
     */
    getMainSubject(query) {
        const tables = this._converter.tables;
        // if there is only one table, return it
        if (Object.keys(tables).length === 1)
            return Object.keys(tables)[0];
        // if there are multiple tables:
        if ((0, sparqljs_typeguard_1.isSelectQuery)(query)) {
            // (1) if there exist an ordering, the table project to the ordering should be chosen
            if (query.order && query.order.length === 1) {
                const order = query.order[0];
                const expression = order.expression;
                (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(expression));
                for (const [subject, table] of Object.entries(tables)) {
                    if (table.projections.some((p) => p.variable === expression.value))
                        return subject;
                }
            }
            // (2) if select variable is in some table's projection, it should be chosen
            for (const variable of query.variables) {
                if (!(0, sparqljs_typeguard_1.isVariable)(variable))
                    continue;
                for (const [subject, table] of Object.entries(tables)) {
                    if (table.projections.some((p) => p.variable === variable.value))
                        return subject;
                }
            }
        }
        // (3) if a table does not have any projection, it should not be the main subject
        // (4) for ASK query, the main subject should have ID filter
        const candidates = [];
        for (const [subject, table] of Object.entries(tables)) {
            if (table.projections.length === 0)
                continue;
            if (!table.filters.some(thingtalk_2.isIdFilter) && (0, sparqljs_typeguard_1.isAskQuery)(query))
                continue;
            candidates.push(subject);
        }
        if (candidates.length === 0)
            throw new Error('Failed to find the main subject');
        // (5) if there are still multiple candidates, sort by complexity
        function complexity(subject) {
            const table = tables[subject];
            return table.filters.length + table.projections.length;
        }
        candidates.sort((a, b) => complexity(b) - complexity(a));
        return candidates[0];
    }
    makeSubquery(mainSubject, subquerySubject) {
        const tables = this._converter.tables;
        const mainTable = tables[mainSubject];
        const subqueryTable = tables[subquerySubject];
        const subquery = this.addFilters((0, thingtalk_2.baseQuery)(subqueryTable.name), subqueryTable.filters);
        // handle comparison of two entities with subquery  
        if (this._converter.comparison.length === 1) {
            const comp = this._converter.comparison[0];
            const mainProperty = mainTable.projections.find((proj) => proj.variable && (proj.variable === comp.lhs || proj.variable === comp.rhs)).property;
            const subqueryProperty = subqueryTable.projections.find((proj) => proj.variable && (proj.variable === comp.lhs || proj.variable === comp.rhs)).property;
            return new thingtalk_1.Ast.ComparisonSubqueryBooleanExpression(null, new thingtalk_1.Ast.Value.VarRef(mainProperty), comp.operator, new thingtalk_1.Ast.ProjectionExpression(null, subquery, [subqueryProperty], [], [], null), null);
        }
        if (mainTable.projections.some((proj) => proj.variable === subquerySubject)) {
            const projection = mainTable.projections.find((proj) => proj.variable === subquerySubject);
            const property = projection.property;
            if (typeof property !== 'string')
                throw new Error(`Subquery on property path not supported`);
            return new thingtalk_1.Ast.ComparisonSubqueryBooleanExpression(null, new thingtalk_1.Ast.Value.VarRef(property), this._converter.schema.getPropertyType(property) instanceof thingtalk_1.Type.Array ? 'contains' : '==', new thingtalk_1.Ast.ProjectionExpression(null, subquery, ['id'], [], [], null), null);
        }
        if (subqueryTable.projections.some((proj) => proj.variable === mainSubject)) {
            const projection = subqueryTable.projections.find((proj) => proj.variable === mainSubject);
            const property = projection.property;
            if (typeof property !== 'string')
                throw new Error(`Subquery on property path not supported`);
            return new thingtalk_1.Ast.ComparisonSubqueryBooleanExpression(null, new thingtalk_1.Ast.Value.VarRef('id'), this._converter.schema.getPropertyType(property) instanceof thingtalk_1.Type.Array ? 'in_array' : '==', new thingtalk_1.Ast.ProjectionExpression(null, subquery, [property], [], [], null), null);
        }
        throw new Error('Failed to generate subquery');
    }
    async makeAtomBooleanExpression(property, value, operator, valueType) {
        let propertyLabel;
        if (property.startsWith(wikidata_1.PROPERTY_PREFIX)) {
            property = property.slice(wikidata_1.PROPERTY_PREFIX.length);
            propertyLabel = this._converter.schema.getProperty(property);
        }
        else {
            propertyLabel = property;
        }
        const propertyType = this._converter.schema.getPropertyType(propertyLabel);
        if (operator === '>' || operator === '<')
            operator = operator + '=';
        if (valueType === thingtalk_1.Type.String)
            operator = propertyType instanceof thingtalk_1.Type.Array ? 'contains~' : '=~';
        return new thingtalk_1.Ast.AtomBooleanExpression(null, propertyLabel, operator !== null && operator !== void 0 ? operator : (propertyType instanceof thingtalk_1.Type.Array ? 'contains' : '=='), await this._value.toThingTalkValue(value, valueType !== null && valueType !== void 0 ? valueType : (0, thingtalk_2.elemType)(propertyType)), null);
    }
}
exports.default = ConverterHelper;
//# sourceMappingURL=index.js.map
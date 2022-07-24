"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const thingtalk_1 = require("thingtalk");
const genie_toolkit_1 = require("genie-toolkit");
const sparqljs_1 = require("sparqljs");
const sparqljs_typeguard_1 = require("../utils/sparqljs-typeguard");
const helpers_1 = __importDefault(require("./helpers"));
const misc_1 = require("../utils/misc");
const wikidata_1 = __importDefault(require("../utils/wikidata"));
const schema_1 = require("../schema");
const thingtalk_2 = require("../utils/thingtalk");
class QueryParser {
    constructor(converter) {
        this._converter = converter;
    }
    async _parseWhere(clauses) {
        const filtersBySubject = new misc_1.ArrayCollection();
        // (1) parse non-filters
        for (const clause of clauses.filter((clause) => clause.type !== 'filter'))
            filtersBySubject.merge(await this._parseWhereClause(clause));
        // (2) parse filters
        for (const clause of clauses.filter((clause) => clause.type === 'filter'))
            filtersBySubject.merge(await this._parseWhereClause(clause));
        // (3) parse qualifiers
        for (const [subject, filters] of filtersBySubject.iterate()) {
            for (const filter of filters)
                this._converter.updateTable(subject, filter);
        }
    }
    async _parseWhereClause(clause) {
        if ((0, sparqljs_typeguard_1.isBasicGraphPattern)(clause))
            return this._converter.helper.parseTriples(clause);
        if ((0, sparqljs_typeguard_1.isFilterPattern)(clause))
            return this._converter.helper.parseFilter(clause);
        if ((0, sparqljs_typeguard_1.isUnionPattern)(clause))
            return this._converter.helper.parseUnion(clause);
        throw new Error(`Unsupported where clause ${JSON.stringify(clause)}`);
    }
    async _parseHaving(group, having) {
        if (group.length > 1)
            throw new Error('Unsupported: group by with multiple fields');
        for (const clause of having !== null && having !== void 0 ? having : [])
            await this._converter.helper.parseGroup(clause, group[0]);
    }
    async _parsePredicates() {
        if (this._converter.helper.predicates.length === 0)
            return;
        const filtersBySubject = await this._converter.helper.convertPredicates();
        for (const [subject, filters] of filtersBySubject.iterate()) {
            for (const filter of filters)
                this._converter.updateTable(subject, filter);
        }
    }
    async parse(query) {
        if (query.where) {
            await this._parseWhere(query.where);
            await this._parsePredicates();
        }
        if ((0, sparqljs_typeguard_1.isSelectQuery)(query) && query.group)
            await this._parseHaving(query.group, query.having);
    }
}
class QueryGenerator {
    constructor(converter) {
        this._converter = converter;
    }
    async _generateSelectQuery(query) {
        const projectionsAndAggregationsBySubject = this._converter.helper.parseVariables(query.variables);
        if (projectionsAndAggregationsBySubject.size === 0)
            throw new Error('No variable found in SPARQL');
        await this._converter.helper.preprocessTables(projectionsAndAggregationsBySubject);
        const mainSubject = this._converter.helper.getMainSubject(query);
        const table = this._converter.tables[mainSubject];
        const filters = [...table.filters];
        for (const subject in this._converter.tables) {
            if (subject === mainSubject)
                continue;
            filters.push(this._converter.helper.makeSubquery(mainSubject, subject));
        }
        let expression = (0, thingtalk_2.baseQuery)(table.name);
        expression = this._converter.helper.addFilters(expression, filters);
        expression = this._converter.helper.addOrdering(expression, table, query.order);
        expression = this._converter.helper.addLimit(expression, query.limit);
        expression = this._converter.helper.addProjectionsAndAggregations(expression, mainSubject, projectionsAndAggregationsBySubject.get(mainSubject));
        return expression;
    }
    _generateAskQuery(query) {
        const mainSubject = this._converter.helper.getMainSubject(query);
        const table = this._converter.tables[mainSubject];
        const filters = [...table.filters];
        for (const subject in this._converter.tables) {
            if (subject === mainSubject)
                continue;
            filters.push(this._converter.helper.makeSubquery(mainSubject, subject));
        }
        return this._converter.helper.addVerification((0, thingtalk_2.baseQuery)(table.name), filters, table.projections);
    }
    async generate(query) {
        const expression = (0, sparqljs_typeguard_1.isSelectQuery)(query) ? (await this._generateSelectQuery(query)) : this._generateAskQuery(query);
        return (0, thingtalk_2.makeProgram)(expression).optimize();
    }
}
class SPARQLToThingTalkConverter {
    constructor(classDef, options) {
        this._sparqlParser = new sparqljs_1.Parser();
        this._class = classDef;
        this._schema = new schema_1.WikiSchema(classDef);
        this._kb = new wikidata_1.default(options.cache, options.bootleg_db);
        this._helper = new helpers_1.default(this);
        this._tokenizer = new genie_toolkit_1.I18n.LanguagePack('en').getTokenizer();
        this._parser = new QueryParser(this);
        this._generator = new QueryGenerator(this);
        this._utterance = undefined;
        this._sparql = undefined;
        this._tables = {};
        this._crossTableComparison = [];
        this._keywords = [];
    }
    get class() {
        return this._class;
    }
    get kb() {
        return this._kb;
    }
    get schema() {
        return this._schema;
    }
    get helper() {
        return this._helper;
    }
    get tables() {
        return this._tables;
    }
    get comparison() {
        return this._crossTableComparison;
    }
    get keywords() {
        return this._keywords;
    }
    get sparql() {
        return this._sparql;
    }
    get utterance() {
        return this._utterance;
    }
    updateTable(subject, update) {
        var _a;
        if (!(subject in this._tables))
            this._tables[subject] = { name: 'entity', projections: [], filters: [] };
        if (update instanceof thingtalk_1.Ast.BooleanExpression)
            this._tables[subject].filters.push(update);
        else if (typeof update === 'string')
            this._tables[subject].name = (_a = this._schema.getTable(update)) !== null && _a !== void 0 ? _a : update;
        else
            this._tables[subject].projections.push(update);
    }
    removeTable(subject) {
        delete this._tables[subject];
    }
    removeProjection(subject, variable) {
        const projections = this._tables[subject].projections;
        for (let i = 0; i < projections.length; i++) {
            const projection = projections[i];
            if (projection.variable === variable) {
                projections.splice(i);
                break;
            }
        }
    }
    addCrossTableComparison(comp) {
        this._crossTableComparison.push(comp);
    }
    _init(sparql, utterance) {
        this._sparql = sparql;
        this._utterance = utterance;
        this._tables = {};
        this._crossTableComparison = [];
        this._helper.init();
        this._keywords = (0, misc_1.getSpans)(this._tokenizer.tokenize(this._utterance).rawTokens.join(' '));
    }
    async convert(sparql, utterance) {
        this._init(sparql, utterance);
        const query = this._sparqlParser.parse(sparql);
        await this._parser.parse(query);
        return this._generator.generate(query);
    }
}
exports.default = SPARQLToThingTalkConverter;
//# sourceMappingURL=sparql2thingtalk.js.map
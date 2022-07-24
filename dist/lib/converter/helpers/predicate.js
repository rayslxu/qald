"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sparqljs_typeguard_1 = require("../../utils/sparqljs-typeguard");
const wikidata_1 = require("../../utils/wikidata");
const thingtalk_1 = require("thingtalk");
const misc_1 = require("../../utils/misc");
const thingtalk_2 = require("../../utils/thingtalk");
// handles predicate with qualifiers
class PredicateParser {
    constructor(converter) {
        this._converter = converter;
        this._predicates = [];
    }
    get predicates() {
        return this._predicates;
    }
    reset() {
        this._predicates = [];
    }
    _findMatchingPredicate(update) {
        for (const predicate of this._predicates) {
            if ((predicate.property !== undefined && predicate.property === update.property) ||
                (predicate.predicate_variable !== undefined && predicate.predicate_variable === update.predicate_variable))
                return predicate;
        }
        return null;
    }
    addOrUpdatePredicate(predicate) {
        const match = this._findMatchingPredicate(predicate);
        if (!match) {
            this._predicates.push(predicate);
        }
        else {
            if (predicate.qualifiers.length > 0)
                match.qualifiers.push(...predicate.qualifiers);
            if (predicate.property)
                match.property = predicate.property;
            if (predicate.table)
                match.table = predicate.table;
            if (predicate.value)
                match.value = predicate.value;
            if (predicate.predicate_variable)
                match.predicate_variable = predicate.predicate_variable;
            if (predicate.op)
                match.op = predicate.op;
            if (predicate.isVariable !== undefined)
                match.isVariable = predicate.isVariable;
        }
    }
    async parse(triple) {
        (0, assert_1.default)((0, sparqljs_typeguard_1.isWikidataPredicateNode)(triple.predicate));
        const subject = triple.subject.value;
        const predicate = triple.predicate.value;
        const object = triple.object.value;
        if ((0, sparqljs_typeguard_1.isWikidataPropertyPredicateNode)(triple.predicate)) {
            const property = this._converter.schema.getProperty(predicate.slice(wikidata_1.PROPERTY_PREDICATE_PREFIX.length));
            if (!property)
                throw new Error(`Failed to find property ${predicate} in schema`);
            this.addOrUpdatePredicate({
                table: subject,
                property,
                predicate_variable: object,
                qualifiers: []
            });
        }
        else if ((0, sparqljs_typeguard_1.isWikidataPropertyQualifierNode)(triple.predicate)) {
            const property = this._converter.schema.getProperty(predicate.slice(wikidata_1.PROPERTY_QUALIFIER_PREFIX.length));
            if (!property)
                throw new Error(`Failed to find property ${predicate} in schema`);
            this.addOrUpdatePredicate({
                predicate_variable: subject,
                qualifiers: [{
                        property,
                        op: '==',
                        value: object,
                        isVariable: (0, sparqljs_typeguard_1.isVariable)(triple.object)
                    }]
            });
        }
        else if ((0, sparqljs_typeguard_1.isWikidataPropertyStatementNode)(triple.predicate)) {
            const property = this._converter.schema.getProperty(predicate.slice(wikidata_1.PROPERTY_STATEMENT_PREFIX.length));
            if (!property)
                throw new Error(`Failed to find property ${predicate} in schema`);
            this.addOrUpdatePredicate({
                property,
                predicate_variable: subject,
                value: object,
                isVariable: (0, sparqljs_typeguard_1.isVariable)(triple.object),
                qualifiers: []
            });
        }
    }
    _hasFieldProjection(table, property) {
        return this._converter.tables[table].projections.some((p) => {
            return typeof p.property === 'string' && p.property.startsWith(`${property}.`);
        });
    }
    _getAndDeleteFieldProjection(table, property) {
        for (const p of this._converter.tables[table].projections) {
            if (typeof p.property === 'string' && p.property.startsWith((`${property}.`))) {
                this._converter.removeProjection(table, p.variable);
                return [p.property.slice(property.length + 1), p.variable];
            }
        }
        return null;
    }
    async _convertPredicate(predicate) {
        var _a;
        (0, assert_1.default)(predicate.table && predicate.property && predicate.qualifiers.length > 0);
        const filtersBySubject = new misc_1.ArrayCollection();
        if (predicate.value) {
            // load all qualifiers        
            const filters = [];
            for (const qualifier of predicate.qualifiers) {
                if (qualifier.isVariable) {
                    this._converter.updateTable(predicate.table, {
                        property: `${predicate.property}.${qualifier.property}`,
                        variable: qualifier.value
                    });
                    continue;
                }
                filters.push(await this._converter.helper.makeAtomBooleanExpression(qualifier.property, qualifier.value, qualifier.op));
            }
            const propertyType = this._converter.schema.getPropertyType(predicate.property);
            // if the predicate has an variable value, add the qualified value to projection
            if (predicate.isVariable === true) {
                const proj = new thingtalk_1.Ast.FilterValue(new thingtalk_1.Ast.VarRefValue(predicate.property), filters.length > 1 ? new thingtalk_1.Ast.AndBooleanExpression(null, filters) : filters[0]);
                this._converter.updateTable(predicate.table, {
                    property: proj,
                    variable: predicate.value
                });
                // if the predicate has an entity value, but there exists an projection on its field
                // add an ArrayFieldValue projection
            }
            else if (this._hasFieldProjection(predicate.table, predicate.property)) {
                filters.push(await this._converter.helper.makeAtomBooleanExpression('value', predicate.value, '==', (0, thingtalk_2.elemType)(propertyType)));
                const proj = new thingtalk_1.Ast.FilterValue(new thingtalk_1.Ast.VarRefValue(predicate.property), filters.length > 1 ? new thingtalk_1.Ast.AndBooleanExpression(null, filters) : filters[0]);
                const [field, variable] = this._getAndDeleteFieldProjection(predicate.table, predicate.property);
                this._converter.updateTable(predicate.table, {
                    property: new thingtalk_1.Ast.ArrayFieldValue(proj, field),
                    variable
                });
                // if the predicate has an entity value, make a qualified filter
            }
            else {
                const lhs = new thingtalk_1.Ast.FilterValue(new thingtalk_1.Ast.VarRefValue(predicate.property), filters.length > 1 ? new thingtalk_1.Ast.AndBooleanExpression(null, filters) : filters[0]);
                let operator = (_a = predicate.op) !== null && _a !== void 0 ? _a : '==';
                if (operator === '>' || operator === '<')
                    operator = operator + '=';
                const rhs = await this._converter.helper.convertValue(predicate.value, propertyType);
                const filter = new thingtalk_1.Ast.ComputeBooleanExpression(null, lhs, operator, rhs, null);
                filtersBySubject.add(predicate.table, filter);
            }
        }
        else {
            for (const qualifier of predicate.qualifiers) {
                if (qualifier.isVariable) {
                    this._converter.updateTable(predicate.table, {
                        property: `${predicate.property}.${qualifier.property}`,
                        variable: qualifier.value
                    });
                    continue;
                }
                const filter = await this._converter.helper.makeAtomBooleanExpression(`${predicate.property}.${qualifier.property}`, qualifier.value, qualifier.op);
                filtersBySubject.add(predicate.table, filter);
            }
        }
        return filtersBySubject;
    }
    async convert() {
        const filtersBySubject = new misc_1.ArrayCollection();
        for (const predicate of this._predicates)
            filtersBySubject.merge(await this._convertPredicate(predicate));
        return filtersBySubject;
    }
}
exports.default = PredicateParser;
//# sourceMappingURL=predicate.js.map
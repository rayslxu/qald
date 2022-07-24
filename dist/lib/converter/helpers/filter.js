"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const thingtalk_1 = require("thingtalk");
const sparqljs_typeguard_1 = require("../../utils/sparqljs-typeguard");
const misc_1 = require("../../utils/misc");
const sparqljs_typeguard_2 = require("../../utils/sparqljs-typeguard");
class FilterParser {
    constructor(converter) {
        this._converter = converter;
    }
    async _parseFilter(expression, negate = false) {
        if (!(0, sparqljs_typeguard_2.isOperationExpression)(expression))
            throw new Error(`Unsupported: non-operation type filter: ${expression}`);
        if (expression.operator === '!')
            return this._parseFilter(expression.args[0], !negate);
        else if (expression.args.length === 1)
            return this._parseUnaryOperation(expression, negate);
        else if (expression.args.length === 2)
            return this._parseBinaryOperation(expression, negate);
        throw new Error(`Unsupported: filters with more than two arguments`);
    }
    _findProperty(variable) {
        for (const [subject, table] of Object.entries(this._converter.tables)) {
            const match = table.projections.find((proj) => proj.variable === variable);
            if (match)
                return { table: subject, property: match.property, type: 'basic' };
        }
        for (const predicate of this._converter.helper.predicates) {
            if (predicate.value === variable)
                return { table: predicate.table, property: predicate.property, type: 'predicate' };
            for (const qualifier of predicate.qualifiers) {
                if (qualifier.value === variable)
                    return { table: predicate.table, property: `${predicate.property}.${qualifier.property}`, type: 'qualifier' };
            }
        }
        return null;
    }
    /**
     * Parse a filter expression where the operation is a unary operation
     * @param expression a filter expression
     * @param negate if the filter should be negated
     */
    async _parseUnaryOperation(expression, negate) {
        const arg = expression.args[0];
        if (expression.operator === 'bound') {
            (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(arg));
            const match = this._findProperty(arg.value);
            if (!match)
                throw new Error(`Cannot find projection ${arg.value}`);
            (0, assert_1.default)(match.type === 'basic');
            let booleanExpression;
            if (typeof match.property === 'string') {
                const propertyType = this._converter.schema.getPropertyType(match.property);
                if (propertyType instanceof thingtalk_1.Type.Array) {
                    booleanExpression = new thingtalk_1.Ast.ComputeBooleanExpression(null, new thingtalk_1.Ast.Value.Computation('count', [new thingtalk_1.Ast.Value.VarRef(match.property)]), '==', new thingtalk_1.Ast.Value.Number(0));
                }
                else {
                    booleanExpression = new thingtalk_1.Ast.AtomBooleanExpression(null, match.property, '==', new thingtalk_1.Ast.Value.Null, null);
                }
            }
            else if (match.property instanceof thingtalk_1.Ast.FilterValue || match.property instanceof thingtalk_1.Ast.ArrayFieldValue) {
                booleanExpression = new thingtalk_1.Ast.ComputeBooleanExpression(null, match.property, '==', new thingtalk_1.Ast.Value.Null, null);
            }
            else {
                booleanExpression = new thingtalk_1.Ast.PropertyPathBooleanExpression(null, match.property, '==', new thingtalk_1.Ast.Value.Null, null);
            }
            if (negate)
                booleanExpression = new thingtalk_1.Ast.NotBooleanExpression(null, booleanExpression);
            return new misc_1.ArrayCollection(match.table, booleanExpression);
        }
        throw new Error(`Unsupported operator ${expression.operator}`);
    }
    /**
     * Parse a filter expression where the operation is a binary operation
     * @param expression a filter expression
     * @param negate if the filter should be negated
     */
    async _parseBinaryOperation(expression, negate) {
        const [lhs, rhs] = expression.args;
        (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(lhs));
        let operator = expression.operator;
        if (operator === '>' || operator === '<')
            operator += '=';
        if ((0, sparqljs_typeguard_1.isVariable)(rhs)) {
            this._converter.addCrossTableComparison({
                lhs: lhs.value,
                operator: operator,
                rhs: rhs.value
            });
            return new misc_1.ArrayCollection();
        }
        else if ((0, sparqljs_typeguard_1.isLiteral)(rhs)) {
            const filtersBySubject = new misc_1.ArrayCollection();
            const match = this._findProperty(lhs.value);
            if (!match)
                throw new Error(`Cannot find projection ${lhs.value}`);
            if (typeof match.property !== 'string')
                throw new Error(`Join on property path not supported`);
            // handle qualifier related filter:
            // do not return it directly, add it the predicates to deal with it later
            if (match.type !== 'basic') {
                if (match.type === 'predicate') {
                    this._converter.helper.updatePredicate({
                        table: match.table,
                        property: match.property,
                        op: operator,
                        value: rhs.value,
                        isVariable: false,
                        qualifiers: []
                    });
                }
                else if (match.type === 'qualifier') {
                    const [property, qualifier] = match.property.split('.');
                    this._converter.helper.updatePredicate({
                        table: match.table,
                        property,
                        qualifiers: [{
                                property: qualifier,
                                op: operator,
                                value: rhs.value,
                                isVariable: false,
                            }]
                    });
                }
                return filtersBySubject;
            }
            // handle regular filters 
            let booleanExpression;
            if (match.property.endsWith('Label')) {
                (0, assert_1.default)(operator === 'regex');
                const property = match.property.slice(0, -'Label'.length);
                const propertyType = this._converter.schema.getPropertyType(property);
                operator = (propertyType instanceof thingtalk_1.Type.Array) ? 'contains~' : '=~';
                booleanExpression = await this._converter.helper.makeAtomBooleanExpression(property, rhs.value, operator, thingtalk_1.Type.String);
            }
            else {
                booleanExpression = await this._converter.helper.makeAtomBooleanExpression(match.property, rhs.value, operator);
            }
            if (negate)
                booleanExpression = new thingtalk_1.Ast.NotBooleanExpression(null, booleanExpression);
            filtersBySubject.add(match.table, booleanExpression);
            return filtersBySubject;
        }
        throw new Error(`Unsupported binary operation ${expression.operator} with value ${rhs}`);
    }
    async parse(filter) {
        const expression = filter.expression;
        return this._parseFilter(expression);
    }
}
exports.default = FilterParser;
//# sourceMappingURL=filter.js.map
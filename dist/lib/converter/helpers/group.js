"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const thingtalk_1 = require("thingtalk");
const sparqljs_typeguard_1 = require("../../utils/sparqljs-typeguard");
class GroupParser {
    constructor(converter) {
        this._converter = converter;
    }
    _aggregateFilter(aggregation, operands, operator, value) {
        if (operator === '>' || operator === '<')
            operator = operator + '=';
        return new thingtalk_1.Ast.ComputeBooleanExpression(null, new thingtalk_1.Ast.ComputationValue(aggregation, operands.map((op) => new thingtalk_1.Ast.Value.VarRef(op))), operator, new thingtalk_1.Ast.Value.Number(value));
    }
    async parse(having, group) {
        (0, assert_1.default)((0, sparqljs_typeguard_1.isVariable)(group.expression));
        const subject = group.expression.value;
        if (!(subject in this._converter.tables))
            throw new Error('Unsupported group by operation on object');
        if ((0, sparqljs_typeguard_1.isOperationExpression)(having)) {
            (0, assert_1.default)(having.args.length === 2);
            const [lhs, rhs] = having.args;
            (0, assert_1.default)((0, sparqljs_typeguard_1.isAggregateExpression)(lhs, 'count') && (0, sparqljs_typeguard_1.isVariable)(lhs.expression) && !lhs.distinct);
            const variable = lhs.expression.value;
            const projection = this._converter.tables[subject].projections.find((proj) => proj.variable === variable);
            if (!projection)
                throw new Error(`Can't find matching variable for the having clause`);
            if (typeof projection.property !== 'string')
                throw new Error(`Having clause not supported for property path`);
            (0, assert_1.default)((0, sparqljs_typeguard_1.isLiteral)(rhs) && Number(rhs.value));
            this._converter.updateTable(subject, this._aggregateFilter('count', [projection.property], having.operator, parseFloat(rhs.value)));
        }
        else {
            throw new Error(`Unsupported having clause ${JSON.stringify(having)}`);
        }
    }
}
exports.default = GroupParser;
//# sourceMappingURL=group.js.map
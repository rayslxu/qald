"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const thingtalk_1 = require("thingtalk");
const Units = __importStar(require("thingtalk-units"));
const words_to_numbers_1 = __importDefault(require("words-to-numbers"));
const wikidata_1 = require("../../utils/wikidata");
const qald_1 = require("../../utils/qald");
const misc_1 = require("../../utils/misc");
// TODO: more nl to thingtalk units 
const unitsMapper = {
    'meters': 'm',
};
class ValueConverter {
    constructor(converter, options) {
        var _a;
        this._converter = converter;
        this._prefix = (_a = options === null || options === void 0 ? void 0 : options.prefix) !== null && _a !== void 0 ? _a : wikidata_1.ENTITY_PREFIX;
    }
    async _getEntityDisplay(qid) {
        const wikidataLabel = await this._converter.kb.getLabel(qid);
        (0, assert_1.default)(wikidataLabel);
        const display = (0, misc_1.closest)(wikidataLabel, this._converter.keywords);
        if (display)
            return display;
        const wikidataAltLabels = await this._converter.kb.getAltLabels(qid);
        for (const altLabel of wikidataAltLabels) {
            const display = (0, misc_1.closest)(altLabel, this._converter.keywords);
            if (display)
                return display;
        }
        if (qid in qald_1.ENTITY_SPAN_OVERRIDE)
            return (0, misc_1.closest)(qald_1.ENTITY_SPAN_OVERRIDE[qid], this._converter.keywords);
        return null;
    }
    _getMeasure(value, baseUnit) {
        const tokens = (0, words_to_numbers_1.default)(this._converter.utterance).toString().split(' ');
        for (let i = 0; i < tokens.length - 1; i++) {
            const number = parseFloat(tokens[i]);
            if (isNaN(number))
                continue;
            const unit = unitsMapper[tokens[i + 1]];
            if (!unit)
                continue;
            if (Units.normalizeUnit(unit) !== baseUnit)
                continue;
            return [number, unit];
        }
        throw new Error(`Failed to find matching measure in the utterance: ${value} ${baseUnit}`);
    }
    _toThingTalkDate(value) {
        const date = new Date(value);
        return new thingtalk_1.Ast.DateValue(new thingtalk_1.Ast.DatePiece(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), null));
    }
    async toThingTalkValue(value, type) {
        if (type instanceof thingtalk_1.Type.Entity) {
            (0, assert_1.default)(typeof value === 'string' && value.startsWith(this._prefix));
            const qid = value.slice(this._prefix.length);
            const display = await this._getEntityDisplay(qid);
            return new thingtalk_1.Ast.Value.Entity(qid, type.type, display);
        }
        if (type instanceof thingtalk_1.Type.Enum) {
            (0, assert_1.default)(typeof value === 'string' && value.startsWith(this._prefix));
            value = value.slice(this._prefix.length);
            const wikidataLabel = await this._converter.kb.getLabel(value);
            (0, assert_1.default)(wikidataLabel);
            return new thingtalk_1.Ast.Value.Enum(wikidataLabel);
        }
        if (type instanceof thingtalk_1.Type.Measure) {
            const [number, unit] = this._getMeasure(parseFloat(value), type.unit);
            return new thingtalk_1.Ast.Value.Measure(number, unit);
        }
        if (type === thingtalk_1.Type.Number)
            return new thingtalk_1.Ast.Value.Number(parseFloat(value));
        if (type === thingtalk_1.Type.String)
            return new thingtalk_1.Ast.Value.String(value);
        if (type === thingtalk_1.Type.Date)
            return this._toThingTalkDate(value);
        if (type instanceof thingtalk_1.Type.Compound)
            return this.toThingTalkValue(value, type.fields.value.type);
        throw new Error('Unsupported value type: ' + type);
    }
}
exports.default = ValueConverter;
//# sourceMappingURL=value.js.map
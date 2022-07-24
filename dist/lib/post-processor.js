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
exports.PostProcessor = void 0;
const assert_1 = __importDefault(require("assert"));
const argparse = __importStar(require("argparse"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = __importDefault(require("stream"));
const byline_1 = __importDefault(require("byline"));
const Tp = __importStar(require("thingpedia"));
const ThingTalk = __importStar(require("thingtalk"));
const thingtalk_1 = require("thingtalk");
const genie_toolkit_1 = require("genie-toolkit");
const misc_1 = require("./utils/misc");
class PostProcessor {
    constructor(options) {
        this._tpClient = options.tpClient;
        this._schemas = options.schemas;
        this._includeEntityValue = options.includeEntityValue;
        this._excludeEntityDisplay = options.excludeEntityDisplay;
    }
    _hasIdFilter(ast) {
        if (ast instanceof thingtalk_1.Ast.OrBooleanExpression)
            return ast.operands.every((op) => this._hasIdFilter(op));
        if (ast instanceof thingtalk_1.Ast.AndBooleanExpression)
            return false;
        if (ast instanceof thingtalk_1.Ast.NotBooleanExpression)
            return false;
        if (ast instanceof thingtalk_1.Ast.AtomBooleanExpression) {
            if (ast.name === 'id') {
                (0, assert_1.default)(ast.value instanceof thingtalk_1.Ast.Value.Entity);
                ast.value.type = 'org.wikidata:entity';
                return true;
            }
        }
        if (ast instanceof thingtalk_1.Ast.ComparisonSubqueryBooleanExpression) {
            if (ast.lhs instanceof thingtalk_1.Ast.Value.VarRef && ast.lhs.name === 'id')
                return true;
        }
        return false;
    }
    _postprocessBooleanExpression(ast) {
        if (ast instanceof thingtalk_1.Ast.AndBooleanExpression || ast instanceof thingtalk_1.Ast.OrBooleanExpression)
            ast.operands = ast.operands.map((op) => this._postprocessBooleanExpression(op));
        else if (ast instanceof thingtalk_1.Ast.NotBooleanExpression)
            ast.expr = this._postprocessBooleanExpression(ast.expr);
        else if (ast instanceof thingtalk_1.Ast.ComparisonSubqueryBooleanExpression)
            ast.rhs = this._postprocessExpression(ast.rhs);
        else if (ast instanceof thingtalk_1.Ast.ExistentialSubqueryBooleanExpression)
            ast.subquery = this._postprocessExpression(ast.subquery);
        return ast;
    }
    _postprocessExpression(ast) {
        if (ast instanceof thingtalk_1.Ast.ChainExpression) {
            ast.expressions = ast.expressions.map((ex) => this._postprocessExpression(ex));
        }
        else if (ast instanceof thingtalk_1.Ast.SortExpression ||
            ast instanceof thingtalk_1.Ast.IndexExpression ||
            ast instanceof thingtalk_1.Ast.ProjectionExpression) {
            ast.expression = this._postprocessExpression(ast.expression);
        }
        else if (ast instanceof thingtalk_1.Ast.BooleanQuestionExpression) {
            ast.expression = this._postprocessExpression(ast.expression);
            ast.booleanExpression = this._postprocessBooleanExpression(ast.booleanExpression);
        }
        else if (ast instanceof thingtalk_1.Ast.FilterExpression) {
            if (this._hasIdFilter(ast.filter)) {
                const invocation = ast.expression.invocation;
                invocation.channel = 'entity';
            }
        }
        return ast;
    }
    async postprocess(thingtalk, preprocessedUtterance) {
        const entities = genie_toolkit_1.EntityUtils.makeDummyEntities(preprocessedUtterance);
        const program = await genie_toolkit_1.ThingTalkUtils.parsePrediction(thingtalk.split(' '), entities, {
            timezone: undefined,
            thingpediaClient: this._tpClient,
            schemaRetriever: this._schemas
        });
        // skip program that does not type check. 
        // TODO: fix typechecking
        if (!program)
            return thingtalk.split(' ');
        (0, assert_1.default)(program instanceof thingtalk_1.Ast.Program);
        const postprocessed = [];
        for (const statement of program.statements) {
            (0, assert_1.default)(statement instanceof thingtalk_1.Ast.ExpressionStatement);
            postprocessed.push(new thingtalk_1.Ast.ExpressionStatement(null, this._postprocessExpression(statement.expression)));
        }
        program.statements = postprocessed;
        return genie_toolkit_1.ThingTalkUtils.serializePrediction(program, preprocessedUtterance, entities, {
            locale: 'en',
            timezone: undefined,
            includeEntityValue: this._includeEntityValue,
            excludeEntityDisplay: this._excludeEntityDisplay
        });
    }
}
exports.PostProcessor = PostProcessor;
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Post process generated data"
    });
    parser.add_argument('-l', '--locale', {
        required: false,
        default: 'en-US',
        help: `BGP 47 locale tag of the language to evaluate (defaults to 'en-US', English)`
    });
    parser.add_argument('--timezone', {
        required: false,
        default: undefined,
        help: `Timezone to use to interpret dates and times (defaults to the current timezone).`
    });
    parser.add_argument('--thingpedia', {
        required: true,
        help: 'Path to ThingTalk file containing class definitions.'
    });
    parser.add_argument('-i', '--input', {
        required: true,
        type: fs_1.default.createReadStream
    });
    parser.add_argument('-o', '--output', {
        required: true,
        type: fs_1.default.createWriteStream
    });
    parser.add_argument('--include-entity-value', {
        action: 'store_true',
        default: false
    });
    parser.add_argument('--exclude-entity-display', {
        action: 'store_true',
        default: false
    });
    const args = parser.parse_args();
    const tpClient = new Tp.FileClient(args);
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null);
    const processor = new PostProcessor({
        tpClient,
        schemas,
        includeEntityValue: args.include_entity_value,
        excludeEntityDisplay: args.exclude_entity_display
    });
    args.input.setEncoding('utf8').pipe((0, byline_1.default)())
        .pipe(new genie_toolkit_1.DatasetParser({ contextual: false, preserveId: true }))
        .pipe(new stream_1.default.Transform({
        objectMode: true,
        async transform(ex, encoding, callback) {
            try {
                const postprocessed = await processor.postprocess(ex.target_code, ex.preprocessed);
                ex.target_code = postprocessed.join(' ');
                callback(null, ex);
            }
            catch (e) {
                callback();
            }
        },
        flush(callback) {
            process.nextTick(callback);
        }
    }))
        .pipe(new genie_toolkit_1.DatasetStringifier())
        .pipe(args.output);
    (0, misc_1.waitFinish)(args.output);
}
if (require.main === module)
    main();
//# sourceMappingURL=post-processor.js.map
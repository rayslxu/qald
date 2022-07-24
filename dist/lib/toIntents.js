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
const argparse = __importStar(require("argparse"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = __importDefault(require("stream"));
const byline_1 = __importDefault(require("byline"));
const Tp = __importStar(require("thingpedia"));
const ThingTalk = __importStar(require("thingtalk"));
const thingtalk_1 = require("thingtalk");
const genie_toolkit_1 = require("genie-toolkit");
const misc_1 = require("./utils/misc");
class GetFunctionVisitor extends thingtalk_1.Ast.NodeVisitor {
    constructor() {
        super(...arguments);
        this.names = [];
    }
    visitInvocation(invocation) {
        this.names.push(invocation.channel);
        return true;
    }
}
function getFunctionNames(ast) {
    const visitor = new GetFunctionVisitor();
    ast.visit(visitor);
    return visitor.names;
}
class GetIdFilterVisitor extends thingtalk_1.Ast.NodeVisitor {
    constructor() {
        super(...arguments);
        this.filters = [];
    }
    _extractIdFilter(ast) {
        if (ast instanceof thingtalk_1.Ast.OrBooleanExpression) {
            for (const operand of ast.operands) {
                const idFilter = this._extractIdFilter(operand);
                if (idFilter)
                    return idFilter;
            }
        }
        if (ast instanceof thingtalk_1.Ast.AtomBooleanExpression) {
            if (ast.name === 'id') {
                (0, assert_1.default)(ast.value instanceof thingtalk_1.Ast.Value.Entity);
                ast.value.type = 'org.wikidata:entity';
                return `id = ${ast.value.display}`;
            }
        }
        return null;
    }
    visitFilterExpression(ast) {
        const idFilter = this._extractIdFilter(ast.filter);
        if (idFilter)
            this.filters.push(idFilter);
        return true;
    }
}
function getIdFilters(ast) {
    const visitor = new GetIdFilterVisitor();
    ast.visit(visitor);
    return visitor.filters;
}
class ThingTalkToIntentConverter {
    constructor(options) {
        this._tpClient = options.tpClient;
        this._schemas = options.schemas;
    }
    async convert(thingtalk, preprocessedUtterance) {
        const entities = genie_toolkit_1.EntityUtils.makeDummyEntities(preprocessedUtterance);
        const program = await genie_toolkit_1.ThingTalkUtils.parsePrediction(thingtalk.split(' '), entities, {
            timezone: undefined,
            thingpediaClient: this._tpClient,
            schemaRetriever: this._schemas
        });
        // skip program that does not type check. 
        // TODO: fix typechecking
        if (!program)
            return thingtalk;
        (0, assert_1.default)(program instanceof thingtalk_1.Ast.Program);
        const functions = getFunctionNames(program);
        const idFilters = getIdFilters(program);
        return [...functions, ...idFilters].join(', ');
    }
}
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Convert thingtalk annotated data into intents and slots"
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
    const args = parser.parse_args();
    const tpClient = new Tp.FileClient(args);
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null);
    const converter = new ThingTalkToIntentConverter({ tpClient, schemas });
    args.input.setEncoding('utf8').pipe((0, byline_1.default)())
        .pipe(new genie_toolkit_1.DatasetParser({ contextual: false, preserveId: true }))
        .pipe(new stream_1.default.Transform({
        objectMode: true,
        async transform(ex, encoding, callback) {
            const intent = await converter.convert(ex.target_code, ex.preprocessed);
            ex.target_code = intent;
            callback(null, ex);
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
//# sourceMappingURL=toIntents.js.map
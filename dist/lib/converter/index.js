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
exports.SPARQLToThingTalkConverter = void 0;
const fs = __importStar(require("fs"));
const stream = __importStar(require("stream"));
const JSONStream_1 = __importDefault(require("JSONStream"));
const argparse = __importStar(require("argparse"));
const Tp = __importStar(require("thingpedia"));
const ThingTalk = __importStar(require("thingtalk"));
const genie_toolkit_1 = require("genie-toolkit");
const qald_1 = require("../utils/qald");
const misc_1 = require("../utils/misc");
const sparql2thingtalk_1 = __importDefault(require("./sparql2thingtalk"));
exports.SPARQLToThingTalkConverter = sparql2thingtalk_1.default;
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "A tool to convert QALD-7 SPARQL to ThingTalk"
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
    parser.add_argument('--manifest', {
        required: true,
        help: 'Path to ThingTalk file containing class definitions.'
    });
    parser.add_argument('--cache', {
        required: false,
        default: 'wikidata_cache.sqlite'
    });
    parser.add_argument('--bootleg-db', {
        required: false,
        default: 'bootleg.sqlite'
    });
    parser.add_argument('-i', '--input', {
        required: true,
        type: fs.createReadStream
    });
    parser.add_argument('-o', '--output', {
        required: true,
        type: fs.createWriteStream
    });
    parser.add_argument('-d', '--drop', {
        required: false,
        type: fs.createWriteStream
    });
    parser.add_argument('--offset', {
        required: false,
        type: parseInt,
        default: 1,
        help: `Start from the nth example`
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
    const tpClient = new Tp.FileClient({ thingpedia: './manifest.tt', locale: 'en' });
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null, true);
    const classDef = await schemas.getFullMeta('org.wikidata');
    const converter = new sparql2thingtalk_1.default(classDef, args);
    const tokenizer = new genie_toolkit_1.I18n.LanguagePack('en').getTokenizer();
    const input = args.input.pipe(JSONStream_1.default.parse('questions.*')).pipe(new stream.PassThrough({ objectMode: true }));
    const output = new genie_toolkit_1.DatasetStringifier();
    output.pipe(args.output);
    const manualConversion = args.exclude_entity_display ? qald_1.MANUAL_CONVERSION_WITHOUT_DISPLAY : qald_1.MANUAL_CONVERSION_WITH_DISPLAY;
    let counter = 0;
    for await (const item of input) {
        counter++;
        if (counter < args.offset)
            continue;
        const preprocessed = tokenizer.tokenize(item.question[0].string).rawTokens.join(' ');
        try {
            if (item.query.sparql in manualConversion) {
                output.write({ id: item.id, preprocessed, target_code: manualConversion[item.query.sparql] });
            }
            else {
                const program = await converter.convert(item.query.sparql, preprocessed);
                await program.typecheck(schemas);
                const target_code = genie_toolkit_1.ThingTalkUtils.serializePrediction(program, preprocessed, genie_toolkit_1.EntityUtils.makeDummyEntities(preprocessed), {
                    locale: 'en',
                    timezone: undefined,
                    includeEntityValue: args.include_entity_value,
                    excludeEntityDisplay: args.exclude_entity_display
                }).join(' ');
                output.write({ id: item.id, preprocessed, target_code });
            }
        }
        catch (e) {
            console.log(`Example ${item.id} failed`);
            if (args.drop)
                args.drop.write(`${item.id}\t${preprocessed}\t${item.query.sparql}\t${e.message.replace(/\s+/g, ' ')}\n`);
            else
                console.log(e.message);
        }
    }
    await (0, misc_1.waitFinish)(input);
    await (0, misc_1.waitFinish)(output);
    if (args.drop)
        await (0, misc_1.waitFinish)(args.drop);
}
if (require.main === module)
    main();
//# sourceMappingURL=index.js.map
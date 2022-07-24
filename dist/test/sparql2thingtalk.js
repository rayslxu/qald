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
const fs = __importStar(require("fs"));
const assert_1 = __importDefault(require("assert"));
const Tp = __importStar(require("thingpedia"));
const ThingTalk = __importStar(require("thingtalk"));
const genie_toolkit_1 = require("genie-toolkit");
const converter_1 = require("../lib/converter");
const testFiles = [
    './test/tests-qid-only.txt',
    './test/tests.txt'
];
async function main() {
    const tpClient = new Tp.FileClient({ thingpedia: './manifest.tt', locale: 'en' });
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null, true);
    const classDef = await schemas.getFullMeta('org.wikidata');
    for (const testFile of testFiles) {
        console.log('Running tests in', testFile);
        const excludeEntityDisplay = testFile.endsWith('qid-only.txt');
        const options = {
            cache: 'wikidata_cache.sqlite',
            bootleg_db: 'bootleg.sqlite'
        };
        const converter = new converter_1.SPARQLToThingTalkConverter(classDef, options);
        const tokenizer = new genie_toolkit_1.I18n.LanguagePack('en').getTokenizer();
        const tests = fs.readFileSync(testFile).toString('utf-8').split('====');
        const index = parseInt(process.argv[2]);
        const start = index ? (index > 0 ? index - 1 : tests.length + index) : 0;
        for (let i = Math.max(start, 0); i < tests.length; i++) {
            console.log(`Running test ${i + 1} ...`);
            const utterance = tests[i].slice(tests[i].indexOf('Utterance:') + 'Utterance:'.length, tests[i].indexOf('SPARQL:')).trim();
            const sparql = tests[i].slice(tests[i].indexOf('SPARQL:') + 'SPARQL:'.length, tests[i].indexOf('TT:')).trim();
            const expected = tests[i].slice(tests[i].indexOf('TT:') + 'TT:'.length).trim();
            const preprocessed = tokenizer.tokenize(utterance).tokens.join(' ');
            const converted = await converter.convert(sparql, preprocessed);
            converted.typecheck(schemas);
            const thingtalk = genie_toolkit_1.ThingTalkUtils.serializePrediction(converted, preprocessed, genie_toolkit_1.EntityUtils.makeDummyEntities(preprocessed), { locale: 'en', timezone: undefined, includeEntityValue: true, excludeEntityDisplay }).join(' ');
            assert_1.default.strictEqual(thingtalk, expected);
        }
    }
}
main();
//# sourceMappingURL=sparql2thingtalk.js.map
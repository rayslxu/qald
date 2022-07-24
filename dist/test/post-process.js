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
const Tp = __importStar(require("thingpedia"));
const ThingTalk = __importStar(require("thingtalk"));
const post_processor_1 = require("../lib/post-processor");
const TEST_CASES = [
    [
        'how many countries are there in europe ?',
        'count ( @org.wikidata . country ( ) filter contains ( continent , " Q46 " ^^org.wikidata:p_continent ) ) ;',
        'count ( @org.wikidata . country ( ) filter contains ( continent , " Q46 " ^^org.wikidata:p_continent ) ) ;'
    ]
];
async function main() {
    const tpClient = new Tp.FileClient({ thingpedia: './manifest.tt', locale: 'en' });
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null, true);
    const processor = new post_processor_1.PostProcessor({ tpClient, schemas, includeEntityValue: true, excludeEntityDisplay: true });
    for (const [utterance, before, after] of TEST_CASES) {
        const processed = await processor.postprocess(before, utterance);
        assert_1.default.strictEqual(processed.join(' '), after);
    }
}
main();
//# sourceMappingURL=post-process.js.map
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
const fs = __importStar(require("fs"));
const stream = __importStar(require("stream"));
const JSONStream_1 = __importDefault(require("JSONStream"));
const argparse = __importStar(require("argparse"));
const misc_1 = require("./utils/misc");
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Estimate the answer accuracy lower bound given the thingtalk results"
    });
    parser.add_argument('--dataset', {
        required: true,
        type: fs.createReadStream
    });
    parser.add_argument('--converted', {
        required: true
    });
    parser.add_argument('--result', {
        required: true
    });
    const args = parser.parse_args();
    const dataset = args.dataset.pipe(JSONStream_1.default.parse('questions.*')).pipe(new stream.PassThrough({ objectMode: true }));
    const answerLength = {};
    for await (const item of dataset) {
        (0, assert_1.default)(item.answers.length === 1);
        const answer = item.answers[0];
        answerLength[item.id] = 'results' in answer ? answer.results.bindings.length : 1;
    }
    const total = Object.keys(answerLength).length;
    const converted = fs.readFileSync(args.converted, { encoding: 'utf8' });
    const convertedIds = converted.split('\n').filter((line) => line.trim().length > 0).map((line) => line.split('\t')[0]);
    const result = fs.readFileSync(args.result, { encoding: 'utf-8' });
    const incorrectIds = result.split('\n').filter((line) => line.trim().length > 0).map((line) => line.split('\t')[0]);
    let TP = 0, FN = 0;
    for (const [id, length] of Object.entries(answerLength)) {
        if (incorrectIds.includes(id) || !convertedIds.includes(id))
            FN += length;
        else
            TP += length;
    }
    const precision = 1;
    const recall = TP / (TP + FN);
    const microF1 = 2 * precision * recall / (precision + recall);
    console.log(`${(convertedIds.length / total * 100).toFixed(2)}% examples converted.`);
    console.log('Micro F1: ', microF1);
    console.log('Macro F1: ', (convertedIds.length - incorrectIds.length) / total);
    await (0, misc_1.waitFinish)(dataset);
}
if (require.main === module)
    main();
//# sourceMappingURL=evaluate.js.map
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
const argparse = __importStar(require("argparse"));
const fs_1 = __importDefault(require("fs"));
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Divide a QALD training file in half"
    });
    parser.add_argument('input', {
        help: "the file to be divided"
    });
    const args = parser.parse_args();
    const data = JSON.parse(fs_1.default.readFileSync(args.input, { encoding: 'utf8' }));
    const length = data.questions.length;
    const a = {
        questions: data.questions.slice(0, length / 2)
    };
    const b = {
        questions: data.questions.slice(length / 2)
    };
    fs_1.default.writeFileSync('xaa', JSON.stringify(a, undefined, 2));
    fs_1.default.writeFileSync('xab', JSON.stringify(b, undefined, 2));
}
if (require.main === module)
    main();
//# sourceMappingURL=divide.js.map
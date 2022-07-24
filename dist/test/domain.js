"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const wikidata_1 = __importDefault(require("../lib/utils/wikidata"));
const bootleg_1 = __importDefault(require("../lib/utils/bootleg"));
const TEST_CASES = [
    ['Q6386177', 'lake'],
    ['Q2608065', 'film'],
    ['Q23572', 'television series'],
    ['Q213959', 'sports team'],
    ['Q128446', 'sports organization'],
    ['Q17527142', 'entity'],
    ['Q125006', 'bridge'],
    ['Q35600', 'landform']
];
async function main() {
    const wikidataUtils = new wikidata_1.default('wikidata_cache.sqlite', 'bootleg.sqlite');
    const bootlegUtils = new bootleg_1.default('bootleg.sqlite');
    for (const [entity, expectedDomain] of TEST_CASES) {
        const entityLabel = await wikidataUtils.getLabel(entity);
        const bootlegType = await bootlegUtils.getType(entity);
        const bootlegTypeLabel = await wikidataUtils.getLabel(bootlegType);
        console.log(`Checking domain for ${entity} (${entityLabel}), with bootleg type ${bootlegTypeLabel} and expected type ${expectedDomain}`);
        const domain = await wikidataUtils.getDomain(entity);
        const domainLabel = await wikidataUtils.getLabel(domain);
        assert_1.default.strictEqual(domainLabel, expectedDomain);
    }
}
main();
//# sourceMappingURL=domain.js.map
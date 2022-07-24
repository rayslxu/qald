"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSpecialUnion = exports.postprocessPropertyPath = exports.extractProperties = exports.extractTriples = void 0;
const assert_1 = __importDefault(require("assert"));
const sparqljs_typeguard_1 = require("./sparqljs-typeguard");
const wikidata_1 = require("./wikidata");
/**
 * Given a parsed object returned by sparqljs, extract rdf triples out of it
 * @param obj any object containing 'triples' field at any depth
 * @returns a flattened array of triples
 */
function extractTriples(obj) {
    const triples = [];
    function extract(obj) {
        if (obj instanceof Object) {
            for (const [key, value] of Object.entries(obj)) {
                if (key === 'triples') {
                    const flattened = value.flat(Infinity);
                    for (const triple of flattened)
                        triples.push(triple);
                }
                else {
                    extract(value);
                }
            }
        }
    }
    extract(obj);
    return triples;
}
exports.extractTriples = extractTriples;
/**
 * Extract Wikidata properties involved in a predicate
 * @param predicate A predicate form sparqljs
 * @returns a flattened array of Wikidata properties (E.g, [P31, P279, ...])
 */
function extractProperties(predicate) {
    const properties = [];
    function extract(predicate) {
        if ((0, sparqljs_typeguard_1.isNamedNode)(predicate)) {
            if (predicate.value.startsWith(wikidata_1.PROPERTY_PREFIX))
                properties.push(predicate.value.slice(wikidata_1.PROPERTY_PREFIX.length));
        }
        else if ((0, sparqljs_typeguard_1.isPropertyPath)(predicate)) {
            // only extract the first item in the property path
            extract(predicate.items[0]);
        }
    }
    extract(predicate);
    return properties;
}
exports.extractProperties = extractProperties;
/**
 * Some heuristics to simplify the property path
 * The simplified version should not have any difference in semantics in natural language
 */
function postprocessPropertyPath(predicate) {
    // property path
    if ((0, sparqljs_typeguard_1.isPropertyPath)(predicate)) {
        if (predicate.pathType === '/') {
            // P31/P279* -> P31
            if (predicate.items.length === 2) {
                const [first, second] = predicate.items;
                if ((0, sparqljs_typeguard_1.isWikidataPropertyNode)(first, 'P31') &&
                    (0, sparqljs_typeguard_1.isUnaryPropertyPath)(second, '*') &&
                    (0, sparqljs_typeguard_1.isWikidataPropertyNode)(second.items[0], 'P279'))
                    return first;
            }
            predicate.items = predicate.items.map((item) => postprocessPropertyPath(item));
        }
        else if (predicate.pathType === '+') {
            (0, assert_1.default)(predicate.items.length === 1);
            const item = predicate.items[0];
            // P131+ -> P131
            if ('termType' in item) {
                if ((0, sparqljs_typeguard_1.isWikidataPropertyNode)(item, 'P131'))
                    return item;
            }
        }
    }
    return predicate;
}
exports.postprocessPropertyPath = postprocessPropertyPath;
/**
 * Handle a few special cases for union clause
 * case 1: { ?s ?p ?o } union { ?s ?p/P17 ?o } ==> { ?s ?p ?o }
 * case 2: { ?s P31 ?o } union { ?s P31/P279* ?o } ==> { ?s P31 ?o }
 * @param predicate A predicate
 * @returns a parsed triple for the special cases, and false if not matched
 */
function parseSpecialUnion(union) {
    if (union.patterns.length !== 2)
        return false;
    if (!(0, sparqljs_typeguard_1.isBasicGraphPattern)(union.patterns[0]) || !(0, sparqljs_typeguard_1.isBasicGraphPattern)(union.patterns[1]))
        return false;
    if (union.patterns[0].triples.length !== 1 || union.patterns[1].triples.length !== 1)
        return false;
    const first = union.patterns[0].triples[0];
    const second = union.patterns[1].triples[0];
    if (!(first.subject.value && first.subject.value === second.subject.value))
        return false;
    if (!(first.object.value && first.object.value === second.object.value))
        return false;
    if (!(0, sparqljs_typeguard_1.isNamedNode)(first.predicate))
        return false;
    if (!(0, sparqljs_typeguard_1.isSequencePropertyPath)(second.predicate))
        return false;
    if (second.predicate.items.length !== 2)
        return false;
    // case 1: { ?s ?p ?o } union { ?s ?p/P17 ?o } ==> { ?s ?p ?o }
    if ((0, sparqljs_typeguard_1.isNamedNode)(second.predicate.items[0]) && (0, sparqljs_typeguard_1.isNamedNode)(second.predicate.items[1]) &&
        second.predicate.items[0].value === first.predicate.value &&
        (0, sparqljs_typeguard_1.isWikidataPropertyNode)(second.predicate.items[1], 'P17')) // country
        return first;
    // case 2: { ?s P31 ?o } union { ?s P31/P279* ?o } ==> { ?s P31 ?o }
    if ((0, sparqljs_typeguard_1.isNamedNode)(second.predicate.items[0]) && (0, sparqljs_typeguard_1.isUnaryPropertyPath)(second.predicate.items[1], '*') &&
        second.predicate.items[0].value === first.predicate.value &&
        (0, sparqljs_typeguard_1.isWikidataPropertyNode)(second.predicate.items[1].items[0], 'P279'))
        return first;
    return false;
}
exports.parseSpecialUnion = parseSpecialUnion;
//# sourceMappingURL=sparqljs.js.map
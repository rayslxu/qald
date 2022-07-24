import { Triple, IriTerm, VariableTerm, PropertyPath, UnionPattern } from 'sparqljs';
/**
 * Given a parsed object returned by sparqljs, extract rdf triples out of it
 * @param obj any object containing 'triples' field at any depth
 * @returns a flattened array of triples
 */
export declare function extractTriples(obj: any): Triple[];
/**
 * Extract Wikidata properties involved in a predicate
 * @param predicate A predicate form sparqljs
 * @returns a flattened array of Wikidata properties (E.g, [P31, P279, ...])
 */
export declare function extractProperties(predicate: IriTerm | PropertyPath | VariableTerm): string[];
/**
 * Some heuristics to simplify the property path
 * The simplified version should not have any difference in semantics in natural language
 */
export declare function postprocessPropertyPath(predicate: IriTerm | PropertyPath | VariableTerm): IriTerm | PropertyPath | VariableTerm;
/**
 * Handle a few special cases for union clause
 * case 1: { ?s ?p ?o } union { ?s ?p/P17 ?o } ==> { ?s ?p ?o }
 * case 2: { ?s P31 ?o } union { ?s P31/P279* ?o } ==> { ?s P31 ?o }
 * @param predicate A predicate
 * @returns a parsed triple for the special cases, and false if not matched
 */
export declare function parseSpecialUnion(union: UnionPattern): Triple | false;

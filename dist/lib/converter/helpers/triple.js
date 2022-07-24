"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const thingtalk_1 = require("thingtalk");
const sparqljs_1 = require("../../utils/sparqljs");
const sparqljs_typeguard_1 = require("../../utils/sparqljs-typeguard");
const wikidata_1 = require("../../utils/wikidata");
const misc_1 = require("../../utils/misc");
const thingtalk_2 = require("../../utils/thingtalk");
class TripleParser {
    constructor(converter) {
        this._converter = converter;
    }
    /**
     * Convert a basic triple to ThingTalk filter
     * @param triple a parsed Triple for SPARQL
     * @returns the subject and the ThingTalk filter
     */
    async _parseBasicTriple(triple) {
        (0, assert_1.default)((0, sparqljs_typeguard_1.isNamedNode)(triple.predicate));
        const filtersBySubject = new misc_1.ArrayCollection();
        const filters = [];
        const subject = triple.subject.value;
        const predicate = triple.predicate.value;
        const object = triple.object.value;
        if (!subject || !predicate || !object)
            throw new Error(`Unsupported triple: ${JSON.stringify(triple)}`);
        // Case 0: if subject is an entity, create an id filter first
        // if the subject is already in the tables, it means we already have the id filter, so no need to run this again
        if ((0, sparqljs_typeguard_1.isWikidataEntityNode)(triple.subject) && !(subject in this._converter.tables)) {
            const domain = await this._converter.kb.getDomain(subject.slice(wikidata_1.ENTITY_PREFIX.length));
            (0, assert_1.default)(domain);
            const table = this._converter.schema.getTable(domain);
            (0, assert_1.default)(table);
            filters.push(new thingtalk_1.Ast.AtomBooleanExpression(null, 'id', '==', await this._converter.helper.convertValue(subject, new thingtalk_1.Type.Entity(`org.wikidata:${table}`)), null));
            this._converter.updateTable(subject, domain);
        }
        // Case 1: handle qualifier related triples
        if ((0, sparqljs_typeguard_1.isWikidataPredicateNode)(triple.predicate)) {
            await this._converter.helper.parsePredicate(triple);
            // Case 2: if subject is an variable and object is an entity, create a regular filter
        }
        else if ((0, sparqljs_typeguard_1.isVariable)(triple.subject) && ((0, sparqljs_typeguard_1.isLiteral)(triple.object) || (0, sparqljs_typeguard_1.isWikidataEntityNode)(triple.object))) {
            // for P31 triple, update the domain of the variable, do not add filter
            if ((0, sparqljs_typeguard_1.isWikidataPropertyNode)(triple.predicate, 'P31')) {
                this._converter.updateTable(subject, object.slice(wikidata_1.ENTITY_PREFIX.length));
                return filtersBySubject;
            }
            if (predicate === wikidata_1.LABEL) {
                filters.push(new thingtalk_1.Ast.AtomBooleanExpression(null, 'id', '=~', new thingtalk_1.Ast.Value.String(object), null));
            }
            else {
                const valueType = (0, sparqljs_typeguard_1.isLiteral)(triple.object) ? thingtalk_1.Type.String : undefined;
                const filter = await this._converter.helper.makeAtomBooleanExpression(predicate, object, undefined, valueType);
                filters.push(filter);
            }
            // Case 3: if object is an variable, create a projection
        }
        else if ((0, sparqljs_typeguard_1.isVariable)(triple.object)) {
            // if predicate is label, add a new projection with suffix "Label" for the property 
            if (predicate === wikidata_1.LABEL) {
                for (const [subj, table] of Object.entries(this._converter.tables)) {
                    const projection = table.projections.find((proj) => proj.variable === subject);
                    if (projection) {
                        this._converter.updateTable(subj, { variable: object, property: projection.property + 'Label' });
                        break;
                    }
                }
            }
            else {
                const property = this._converter.schema.getProperty(predicate.slice(wikidata_1.PROPERTY_PREFIX.length));
                this._converter.updateTable(subject, { variable: object, property });
            }
            // Case 4: if both subject and object are entities, create a filter, for verification
        }
        else if ((0, sparqljs_typeguard_1.isNamedNode)(triple.subject) && (0, sparqljs_typeguard_1.isNamedNode)(triple.object)) {
            const filter = await this._converter.helper.makeAtomBooleanExpression(predicate, object);
            this._converter.updateTable(subject, filter);
        }
        else {
            throw new Error('Unexpected triple: ' + triple);
        }
        filtersBySubject.add(subject, ...filters);
        return filtersBySubject;
    }
    async _parseSequencePathTriple(triple) {
        (0, assert_1.default)((0, sparqljs_typeguard_1.isPropertyPath)(triple.predicate));
        const filtersBySubject = new misc_1.ArrayCollection();
        const filters = [];
        const subject = triple.subject.value;
        const predicate = triple.predicate;
        const object = triple.object.value;
        // if subject is an entity, create an id filter
        if ((0, sparqljs_typeguard_1.isWikidataEntityNode)(triple.subject) && !(subject in this._converter.tables)) {
            const domain = await this._converter.kb.getDomain(subject.slice(wikidata_1.ENTITY_PREFIX.length));
            (0, assert_1.default)(domain);
            const table = this._converter.schema.getTable(domain);
            (0, assert_1.default)(table);
            filters.push(new thingtalk_1.Ast.AtomBooleanExpression(null, 'id', '==', await this._converter.helper.convertValue(subject, new thingtalk_1.Type.Entity(`org.wikidata:${table}`)), null));
            this._converter.updateTable(subject, domain);
        }
        const sequence = [];
        if (predicate.items.length === 1) {
            (0, assert_1.default)((0, sparqljs_typeguard_1.isNamedNode)(predicate.items[0]));
            const property = this._converter.schema.getProperty(predicate.items[0].value.slice(wikidata_1.PROPERTY_PREFIX.length));
            sequence.push(new thingtalk_1.Ast.PropertyPathElement(property, predicate.pathType));
        }
        else {
            // sequence property path
            (0, assert_1.default)(predicate.pathType === '/');
            for (const element of predicate.items) {
                if ((0, sparqljs_typeguard_1.isWikidataPropertyNode)(element)) {
                    const property = this._converter.schema.getProperty(element.value.slice(wikidata_1.PROPERTY_PREFIX.length));
                    sequence.push(new thingtalk_1.Ast.PropertyPathElement(property));
                }
                else if ((0, sparqljs_typeguard_1.isUnaryPropertyPath)(element)) {
                    (0, assert_1.default)(element.items.length === 1 && (0, sparqljs_typeguard_1.isNamedNode)(element.items[0]));
                    const property = this._converter.schema.getProperty(element.items[0].value.slice(wikidata_1.PROPERTY_PREFIX.length));
                    sequence.push(new thingtalk_1.Ast.PropertyPathElement(property, element.pathType));
                }
            }
        }
        const lastPropertyType = this._converter.schema.getPropertyType(sequence[sequence.length - 1].property);
        if ((0, sparqljs_typeguard_1.isVariable)(triple.object)) {
            this._converter.updateTable(subject, { property: sequence, variable: object });
        }
        else {
            const value = await this._converter.helper.convertValue(object, (0, thingtalk_2.elemType)(lastPropertyType));
            const filter = new thingtalk_1.Ast.PropertyPathBooleanExpression(null, sequence, lastPropertyType instanceof thingtalk_1.Type.Array ? 'contains' : '==', value, null);
            filters.push(filter);
        }
        filtersBySubject.add(subject, ...filters);
        return filtersBySubject;
    }
    async parse(pattern) {
        const filtersBySubject = new misc_1.ArrayCollection();
        for (const triple of pattern.triples) {
            triple.predicate = (0, sparqljs_1.postprocessPropertyPath)(triple.predicate);
            if ((0, sparqljs_typeguard_1.isPropertyPath)(triple.predicate))
                filtersBySubject.merge(await this._parseSequencePathTriple(triple));
            else
                filtersBySubject.merge(await this._parseBasicTriple(triple));
        }
        return filtersBySubject;
    }
}
exports.default = TripleParser;
//# sourceMappingURL=triple.js.map
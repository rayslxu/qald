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
const path = __importStar(require("path"));
const argparse = __importStar(require("argparse"));
const csv_stringify_1 = __importDefault(require("csv-stringify"));
const thingtalk_1 = require("thingtalk");
const genie_toolkit_1 = require("genie-toolkit");
const sparqljs_1 = require("sparqljs");
const sparqljs_2 = require("./utils/sparqljs");
const qald_1 = require("./utils/qald");
const misc_1 = require("./utils/misc");
const thingtalk_2 = require("./utils/thingtalk");
const wikidata_1 = __importDefault(require("./utils/wikidata"));
const wikidata_2 = require("./utils/wikidata");
class ManifestGenerator {
    constructor(options) {
        this._experiment = options.experiment;
        this._wikidata = new wikidata_1.default(options.cache, options.bootleg_db);
        this._parser = new sparqljs_1.Parser();
        this._tokenizer = new genie_toolkit_1.I18n.LanguagePack('en-US').getTokenizer();
        this._examples = (0, qald_1.preprocessQALD)(options.experiment);
        this._domainLabels = {};
        this._domainSamples = {};
        this._entities = {};
        this._propertyLabelsByDomain = {};
        this._properties = {};
        this._propertyValues = { entities: {}, strings: {} };
        this._propertyTypes = {};
        this._output = options.output;
        this._includeNonEntityProperties = !options.exclude_non_entity_properties;
        this._useWikidataAltLabels = options.use_wikidata_alt_labels;
    }
    /**
     * Get the domain of a entity
     * @param entityId QID of an entity
     * @returns its domain, i.e., heuristically the best entity among values of P31 (instance of)
     */
    async _getEntityType(entityId) {
        return this._wikidata.getDomain(entityId);
    }
    /**
     * Add property to domain
     * @param entityId QID of a domain
     * @param propertyId PID of a property
     */
    async _updateProperties(entityId, propertyId) {
        if (!(entityId in this._propertyLabelsByDomain))
            this._propertyLabelsByDomain[entityId] = {};
        const propertyLabel = await this._wikidata.getLabel(propertyId);
        this._propertyLabelsByDomain[entityId][propertyId] = propertyLabel !== null && propertyLabel !== void 0 ? propertyLabel : propertyId;
    }
    /**
     * Get the thingtalk type of a property
     * @param domain the QID of the domain
     * @param propertyId the PID of the property
     * @param propertyName the name of the property
     * @returns the ThingTalk type of the property
     */
    async _getPropertyType(domain, propertyId, propertyName) {
        if (propertyId in this._propertyTypes)
            return this._propertyTypes[propertyId];
        let type = await this._getPropertyTypeHelper(propertyId, propertyName);
        const qualifiers = await this._wikidata.getQualifiersByProperty(domain, propertyId);
        if (type && qualifiers.length > 0) {
            const fields = {
                value: new thingtalk_1.Ast.ArgumentDef(null, null, 'value', (0, thingtalk_2.elemType)(type))
            };
            for (const qualifier of qualifiers) {
                const name = this._wikidata.qualifiers[qualifier].name;
                const qtype = this._wikidata.qualifiers[qualifier].type;
                const annotation = {
                    nl: { canonical: await this._generatePropertyCanonicals(qualifier, name, qtype) },
                    impl: { wikidata_id: new thingtalk_1.Ast.Value.String(qualifier) }
                };
                fields[qualifier] = new thingtalk_1.Ast.ArgumentDef(null, null, name, qtype, annotation);
            }
            const compoundType = new thingtalk_1.Type.Compound(null, fields);
            type = type instanceof thingtalk_1.Type.Array ? new thingtalk_1.Type.Array(compoundType) : compoundType;
        }
        this._propertyTypes[propertyId] = type;
        return type;
    }
    async _getPropertyTypeHelper(propertyId, propertyName) {
        if (propertyId === 'P21')
            return new thingtalk_1.Type.Enum(['female', 'male']);
        const wikibaseType = await this._wikidata.getPropertyType(propertyId);
        if (wikibaseType === 'String' || wikibaseType === 'Monolingualtext')
            return thingtalk_1.Type.String;
        if (wikibaseType === 'Url')
            return new thingtalk_1.Type.Entity('tt:url');
        if (wikibaseType === 'CommonsMedia')
            return new thingtalk_1.Type.Entity('tt:picture');
        if (wikibaseType === 'Time')
            return thingtalk_1.Type.Date;
        if (wikibaseType === 'Quantity') {
            const units = await this._wikidata.getAllowedUnits(propertyId);
            if (units.length > 0) {
                if (units.includes('kilogram'))
                    return new thingtalk_1.Type.Measure('kg');
                if (units.includes('metre') || units.includes('kilometre'))
                    return new thingtalk_1.Type.Measure('m');
                if (units.includes('second') || units.includes('year') || units.includes(('minute') || units.includes('hour') || units.includes('day')))
                    return new thingtalk_1.Type.Measure('ms');
                if (units.includes('degree Celsius'))
                    return new thingtalk_1.Type.Measure('C');
                if (units.includes('metre per second') || units.includes('kilometre per second'))
                    return new thingtalk_1.Type.Measure('mps');
                if (units.includes('square metre') || units.includes('square kilometre'))
                    return new thingtalk_1.Type.Measure('m2');
                if (units.includes('cubic metre'))
                    return new thingtalk_1.Type.Measure('m3');
                if (units.includes('percent'))
                    return thingtalk_1.Type.Number;
                if (units.includes('United States dollar'))
                    return thingtalk_1.Type.Currency;
                if (units.includes('human')) // capacity
                    return thingtalk_1.Type.Number;
                if (units.includes('radian'))
                    return thingtalk_1.Type.Number;
                if (units.includes('years old') || units.includes('annum'))
                    return thingtalk_1.Type.Number;
                console.log(`Unsupported measurement type with unit ${units.join(', ')} for ${propertyId}, use Number instead`);
            }
            return thingtalk_1.Type.Number;
        }
        if (wikibaseType === 'WikibaseItem')
            return new thingtalk_1.Type.Array(new thingtalk_1.Type.Entity(`org.wikidata:p_${propertyName}`));
        // unsupported
        return null;
    }
    /**
     * Get the canonicals for a given property
     * @param id QID of the property
     * @param label Label of property
     * @param type ThingTalk type of the property
     */
    async _generatePropertyCanonicals(id, label, type) {
        const labels = [label];
        if (this._useWikidataAltLabels) {
            const altLabels = await this._wikidata.getAltLabels(id);
            labels.push(...altLabels);
        }
        const baseCanonical = {};
        for (const label of labels)
            (0, genie_toolkit_1.genBaseCanonical)(baseCanonical, label, type, null);
        return baseCanonical;
    }
    /**
     * Add an entity to entities.json
     * @param type the entity type
     * @param name the name of the entity
     */
    _addEntity(type, name) {
        if (!(type in this._entities)) {
            this._entities[type] = {
                type: `org.wikidata:${type}`,
                name,
                is_well_known: false,
                has_ner_support: true,
                subtype_of: type === 'entity' ? null : ['org.wikidata:entity']
            };
        }
    }
    /**
     * Process one example in QALD
     * (1) get all subject, and add their domain into domain list
     * (2) make sure all properties used are covered for the domain
     * @param example an cleaned QALD example
     */
    async _processOneExample(example) {
        var _a;
        try {
            const parsed = this._parser.parse(example.sparql);
            const triples = (0, sparqljs_2.extractTriples)(parsed);
            const variables = {};
            // if variable appears as a subject of a statement, where to predicate is P31
            // add the object of this statement into the domain list
            for (const triple of triples) {
                if (triple.predicate.value === `${wikidata_2.PROPERTY_PREFIX}P31` &&
                    triple.subject.termType === 'Variable' &&
                    triple.object.termType === 'NamedNode') {
                    const domain = triple.object.value.slice(wikidata_2.ENTITY_PREFIX.length);
                    variables[triple.subject.value] = domain;
                    this._domainLabels[domain] = (_a = await this._wikidata.getLabel(domain)) !== null && _a !== void 0 ? _a : domain;
                }
            }
            for (const triple of triples) {
                if (triple.subject.termType === 'NamedNode') {
                    const entityId = triple.subject.value.slice(wikidata_2.ENTITY_PREFIX.length);
                    const domain = await this._getEntityType(entityId);
                    if (!domain)
                        continue;
                    const domainLabel = await this._wikidata.getLabel(domain);
                    this._domainLabels[domain] = domainLabel || domain;
                    for (const property of (0, sparqljs_2.extractProperties)(triple.predicate))
                        await this._updateProperties(domain, property);
                }
                else if (triple.subject.termType === 'Variable' && triple.subject.value in variables) {
                    const domain = variables[triple.subject.value];
                    for (const property of (0, sparqljs_2.extractProperties)(triple.predicate))
                        await this._updateProperties(domain, property);
                }
            }
        }
        catch (e) {
            console.log(`Failed to convert sparql: ${example.sparql}`);
            console.error(e);
        }
    }
    /**
     * Process all examples in QALD
     */
    async _processExamples() {
        for (const example of this._examples)
            await this._processOneExample(example);
    }
    /**
     * Query Wikidata to obtain common properties of a domain
     * @param domain QID of a domain
     * @param entityType snake cased label of the domain
     */
    async _processDomainProperties(domain, entityType) {
        var _a, _b;
        const args = [(0, thingtalk_2.idArgument)((0, misc_1.cleanName)(entityType))];
        const propertyValues = await this._wikidata.getDomainPropertiesAndValues(domain, this._includeNonEntityProperties);
        const propertyLabels = await this._wikidata.getLabelsByBatch(...Object.keys(propertyValues));
        const entityValues = Object.values(propertyValues).flat().filter(this._wikidata.isEntity);
        const valueLabels = await this._wikidata.getLabelsByBatch(...entityValues);
        for (const [property, values] of Object.entries(propertyValues)) {
            const label = (_a = propertyLabels[property]) !== null && _a !== void 0 ? _a : property;
            const pname = (0, misc_1.cleanName)(label);
            const ptype = await this._getPropertyType(domain, property, pname);
            if (!ptype)
                continue;
            const argumentDef = new thingtalk_1.Ast.ArgumentDef(null, thingtalk_1.Ast.ArgDirection.OUT, pname, ptype, {
                nl: { canonical: await this._generatePropertyCanonicals(property, label, ptype) },
                impl: { wikidata_id: new thingtalk_1.Ast.Value.String(property) }
            });
            args.push(argumentDef);
            this._addEntity(`p_${pname}`, label);
            if (!(property in this._properties))
                this._properties[property] = argumentDef;
            // TODO: separate property values by domain
            if (values.length === 0)
                continue;
            const vtype = (0, thingtalk_2.elemType)(ptype);
            if (vtype instanceof thingtalk_1.Type.Entity) {
                if (!(pname in this._propertyValues.entities))
                    this._propertyValues.entities[pname] = {};
                for (const value of values) {
                    if (value in this._propertyValues.entities[pname])
                        continue;
                    this._propertyValues.entities[pname][value] = (_b = valueLabels[value]) !== null && _b !== void 0 ? _b : value;
                }
            }
            if (vtype === thingtalk_1.Type.String) {
                if (!(pname in this._propertyValues.strings))
                    this._propertyValues.strings[pname] = [];
                for (const value of values)
                    this._propertyValues.strings[pname].push(value);
            }
        }
        return args;
    }
    /**
     * Get a thingtalk query for a domain
     * @param domain QID of a domain
     * @returns A function definition of this domain
     */
    async _processDomain(domain) {
        const domainLabel = this._domainLabels[domain];
        console.log(`Sampling ${domainLabel} domain ...`);
        const fname = (0, misc_1.cleanName)(domainLabel);
        this._addEntity(fname, domainLabel);
        const samples = await this._wikidata.getEntitiesByDomain(domain);
        const sampleLabels = await this._wikidata.getLabelsByBatch(...samples);
        this._domainSamples[fname] = sampleLabels;
        // get all properties by sampling Wikidata
        const args = await this._processDomainProperties(domain, fname);
        const missing = [];
        // add missing properties needed by QALD if necessary 
        for (const [id, label] of Object.entries(this._propertyLabelsByDomain[domain])) {
            const pname = (0, misc_1.cleanName)(label);
            if (args.some((a) => a.name === pname) || id === 'P31')
                continue;
            missing.push([id, label]);
            const ptype = await this._getPropertyType(domain, id, pname);
            if (!ptype)
                throw new Error('Unsupported property type for property ' + pname);
            const argumentDef = new thingtalk_1.Ast.ArgumentDef(null, thingtalk_1.Ast.ArgDirection.OUT, pname, ptype, {
                nl: { canonical: await this._generatePropertyCanonicals(id, label, ptype) },
                impl: { wikidata_id: new thingtalk_1.Ast.Value.String(id) }
            });
            args.push(argumentDef);
            this._addEntity(`p_${pname}`, label);
            this._properties[label] = argumentDef;
        }
        console.log(`Done sampling ${domainLabel} domain`);
        console.log(`In total ${args.length} properties sampled, ${missing.length} not covered`);
        if (missing.length > 0)
            console.log(missing.map(([id, label]) => `${label} (${id})`).join(', '));
        const functionDef = new thingtalk_1.Ast.FunctionDef(null, 'query', null, fname, ['entity'], {
            is_list: true,
            is_monitorable: false
        }, args, {
            nl: { canonical: [domainLabel] },
            impl: {
                inherit_arguments: new thingtalk_1.Ast.Value.Boolean(false),
                handle_thingtalk: new thingtalk_1.Ast.Value.Boolean(true),
                wikidata_subject: new thingtalk_1.Ast.Value.Array([new thingtalk_1.Ast.Value.String(domain)])
            }
        });
        return [fname, functionDef];
    }
    /**
     * Generate the manifest
     * @returns the class definition
     */
    async _generateManifest() {
        // imports
        const imports = [
            new thingtalk_1.Ast.MixinImportStmt(null, ['loader'], 'org.thingpedia.v2', []),
            new thingtalk_1.Ast.MixinImportStmt(null, ['config'], 'org.thingpedia.config.none', [])
        ];
        // queries
        const queries = {};
        for (const domain in this._propertyLabelsByDomain) {
            const [fname, functionDef] = await this._processDomain(domain);
            queries[fname] = functionDef;
        }
        queries['entity'] = new thingtalk_1.Ast.FunctionDef(null, 'query', null, 'entity', [], {
            is_list: true,
            is_monitorable: false
        }, [(0, thingtalk_2.idArgument)('entity'), ...Object.values(this._properties)], {
            nl: { canonical: ['entity'] },
            impl: {
                handle_thingtalk: new thingtalk_1.Ast.Value.Boolean(true),
                wikidata_subject: new thingtalk_1.Ast.Value.Array([new thingtalk_1.Ast.Value.String('Q35120')])
            }
        });
        this._addEntity('entity', 'Entity');
        // entity declarations
        const entities = Object.values(this._entities).map((entity) => {
            var _a;
            return new thingtalk_1.Ast.EntityDef(null, entity.type.slice('org.wikidata:'.length), ((_a = entity.subtype_of) !== null && _a !== void 0 ? _a : []).map((e) => e.slice('org.wikidata:'.length)), { impl: { has_ner: new thingtalk_1.Ast.Value.Boolean(!!entity.has_ner_support) } });
        });
        console.log('Start writing device manifest ...');
        const whitelist = new thingtalk_1.Ast.Value.Array(Object.keys(queries).filter((qname) => qname !== 'entity').map((qname) => new thingtalk_1.Ast.Value.String(qname)));
        return new thingtalk_1.Ast.ClassDef(null, 'org.wikidata', null, {
            imports, queries, entities
        }, {
            nl: { name: `WikidataQA based on ${this._experiment}`, description: 'Question Answering over Wikidata' },
            impl: { whitelist }
        });
    }
    /**
     * Output the parameter datasets
     */
    async _outputParameterDatasets() {
        const dir = path.dirname(this._output.path);
        const index = fs.createWriteStream(dir + '/parameter-datasets.tsv');
        // write entity dataset for ids 
        for (const [fname, values] of Object.entries(this._domainSamples)) {
            index.write(`entity\ten-US\torg.wikidata:${fname}\tparameter-datasets/${fname}.json\n`);
            const paramDataset = fs.createWriteStream(dir + `/parameter-datasets/${fname}.json`);
            const data = { result: "ok", data: [] };
            for (const [value, display] of Object.entries(values)) {
                if (display) {
                    const tokenized = this._tokenizer.tokenize(display);
                    data.data.push({ value: value, name: display, canonical: tokenized.rawTokens.join(' ') });
                }
            }
            paramDataset.end(JSON.stringify(data, undefined, 2));
            await (0, misc_1.waitFinish)(paramDataset);
        }
        // write entity dataset for other properties
        for (const [pname, values] of Object.entries(this._propertyValues.entities)) {
            index.write(`entity\ten-US\torg.wikidata:p_${pname}\tparameter-datasets/p_${pname}.json\n`);
            const paramDataset = fs.createWriteStream(dir + `/parameter-datasets/p_${pname}.json`);
            const data = { result: "ok", data: [] };
            for (const [value, display] of Object.entries(values)) {
                if (display) {
                    const tokenized = this._tokenizer.tokenize(display);
                    data.data.push({ value: value, name: display, canonical: tokenized.rawTokens.join(' ') });
                }
            }
            paramDataset.end(JSON.stringify(data, undefined, 2));
            await (0, misc_1.waitFinish)(paramDataset);
        }
        // write string dataset for properties
        for (const [pname, values] of Object.entries(this._propertyValues.strings)) {
            index.write(`string\ten-US\torg.wikidata:p_${pname}\tparameter-datasets/p_${pname}.tsv\n`);
            const paramDataset = fs.createWriteStream(dir + `/parameter-datasets/p_${pname}.tsv`);
            const output = (0, csv_stringify_1.default)({ header: false, delimiter: '\t' });
            for (const value of values) {
                const tokenized = this._tokenizer.tokenize(value);
                output.write([value, tokenized.rawTokens.join(' '), 1]);
            }
            output.end();
            await (0, misc_1.waitFinish)(paramDataset);
        }
        index.end();
        await (0, misc_1.waitFinish)(index);
    }
    /**
     * Output entities.json
     */
    async _outputEntities() {
        const dir = path.dirname(this._output.path);
        const output = fs.createWriteStream(dir + '/entities.json');
        const data = { result: "ok", data: Object.values(this._entities) };
        output.end(JSON.stringify(data, undefined, 2));
        await (0, misc_1.waitFinish)(output);
    }
    /**
     * Process all examples in QALD and then generate/output the manifest and parameter datasets
     */
    async generate() {
        console.log('Start processing QALD examples ...');
        await this._processExamples();
        console.log(`Done processing QALD examples, ${Object.keys(this._domainLabels).length} domains discovered: `);
        for (const [domain, domainLabel] of Object.entries(this._domainLabels))
            console.log(`${domain}: ${domainLabel}`);
        console.log('Start sampling Wikidata for schema ...');
        const classDef = await this._generateManifest();
        this._output.end(classDef.prettyprint());
        await (0, misc_1.waitFinish)(this._output);
        console.log('Start generating parameter datasets ...');
        await this._outputEntities();
        await this._outputParameterDatasets();
        console.log('Done.');
    }
}
async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Generate a schema and parameter dataset from QALD-7"
    });
    parser.add_argument('-o', '--output', {
        required: true,
        type: fs.createWriteStream
    });
    parser.add_argument('--experiment', {
        required: false,
        default: 'qald7'
    });
    parser.add_argument('--cache', {
        required: false,
        default: 'wikidata_cache.sqlite'
    });
    parser.add_argument('--exclude-non-entity-properties', {
        action: 'store_true',
        default: false
    });
    parser.add_argument('--use-wikidata-alt-labels', {
        action: 'store_true',
        help: 'Enable wikidata alternative labels as annotations.',
        default: false
    });
    parser.add_argument('--bootleg-db', {
        required: false,
        default: 'bootleg.sqlite'
    });
    const args = parser.parse_args();
    const generator = new ManifestGenerator(args);
    generator.generate();
}
main();
//# sourceMappingURL=manifest-generator.js.map
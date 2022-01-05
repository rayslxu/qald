import * as fs from 'fs';
import { promises as pfs } from 'fs';
import assert from 'assert';
import JSONStream from 'JSONStream';
import { closest } from 'fastest-levenshtein';
import { Ast, Type } from 'thingtalk';
import * as ThingTalk from 'thingtalk';
import { SelectQuery, Parser, SparqlParser } from 'sparqljs';
import * as argparse from 'argparse';
import { waitFinish } from './utils/misc';
import WikidataUtils from './utils/wikidata';
import { ENTITY_PREFIX, PROPERTY_PREFIX } from './utils/wikidata';
import { AtomBooleanExpression } from 'thingtalk/dist/ast';
import { I18n } from 'genie-toolkit';

/**
 * A shortcut for quickly creating a basic query
 * @param domain the name of a domain
 * @return an invocation of a base domain query (no projection, no filter)
 */
function baseQuery(domain : string) {
    return new Ast.InvocationExpression(
        null,
        new Ast.Invocation(null, new Ast.DeviceSelector(null, 'org.wikidata', null, null), domain, [], null),
        null
    );
}

/**
 * A shortcut for creating a program from an query expression
 * @param expression a ThingTalk query expression
 * @returns a ThingTalk program 
 */
function makeProgram(expression : Ast.Expression) {
    if (!(expression instanceof Ast.ChainExpression))
        expression = new Ast.ChainExpression(null, [expression], expression.schema);
    return new Ast.Program(null, [], [], [new Ast.ExpressionStatement(null, expression)]);
}

 
/**
 * A class to retrieve schema information from the schema
 */
class WikiSchema {
    private _tableMap : Record<string, string>;
    private _propertyMap : Record<string, string>;
    private _propertyTypeMap : Record<string, Type>;

    constructor(schema : Ast.ClassDef) {
        this._tableMap = {};
        this._propertyMap = {};
        this._propertyTypeMap = {};
        for (const [qname, query] of Object.entries(schema.queries)) {
            const qid = ((query.getImplementationAnnotation('wikidata_subject')) as any[])[0];
            this._tableMap[qid] = qname;
            for (const arg of query.iterateArguments()) {
                if (arg.name === 'id')
                    continue;
                const pid = arg.getImplementationAnnotation('wikidata_id') as string;
                this._propertyMap[pid] = arg.name;
                this._propertyTypeMap[pid] = arg.type;
            }
        }
    }

    /**
     * @param qid QID of a domain
     * @returns the table name (cleaned label of the QID)
     */
    getTable(qid : string) : string {
        return this._tableMap[qid];
    }

    /**
     * @param pid PID of a property
     * @returns the property name (cleaned label of the PID)
     */
    getProperty(pid : string) : string {
        return this._propertyMap[pid];
    }

    /**
     * @param pid PID of a property
     * @returns the entity type of the property 
     */
    getPropertyType(pid : string) : Type {
        return this._propertyTypeMap[pid];
    }
}

interface Projection {
    property : string, 
    variable : string
}

interface Table {
    domain : string,
    projections : Projection[],
    filters : Ast.BooleanExpression[]
}

export default class SPARQLToThingTalkConverter {
    private _schema : WikiSchema;
    private _parser : SparqlParser;
    private _wikidata : WikidataUtils;
    private _tokenizer : I18n.BaseTokenizer;
    private _keywords : string[];
    private _tables : Record<string, Table>;

    constructor(classDef : Ast.ClassDef) {
        this._schema = new WikiSchema(classDef);
        this._parser = new Parser();
        this._wikidata = new WikidataUtils();
        this._tokenizer = new I18n.LanguagePack('en').getTokenizer();
        this._tables = {};
        this._keywords = [];
    } 

    /**
     * Add a filter to a able
     * @param subject the subject, a variable in SPARQL
     * @param filter a filter to add to the subject
     */
    private _addFilter(subject : string, filter : Ast.BooleanExpression) {
        if (!(subject in this._tables))
            this._tables[subject] = { domain: 'entity', projections: [], filters: [] };
        this._tables[subject].filters.push(filter);
    }

    /**
     * Add a projection to a table
     * @param subject the subject, either a variable, or an entity
     * @param projection a projection to add to the subject
     */
    private _addProjection(subject : string, projection : Projection) {
        if (!(subject in this._tables))
            this._tables[subject] = { domain: 'entity', projections: [], filters: [] };
        this._tables[subject].projections.push(projection);
    }

    /**
     * Set the domain for a table
     * @param subject the subject, either a variable or an entity
     * @param domain the QID of the domain
     */
    private _setDomain(subject : string, domain : string) {
        if (!(subject in this._tables))
            this._tables[subject] = { domain: 'entity', projections: [], filters: [] };
        this._tables[subject].domain = this._schema.getTable(domain);
    }
     
    /**
     * Convert a value in SPARQL into a ThingTalk value
     * @param value a value in the SPARQL triple
     * @param propertyType the ThingTalk type of the property
     * @returns a ThingTalk value
     */
    private async _toThingTalkValue(value : any, propertyType : Type) : Promise<Ast.Value> {
        let valueType = propertyType;
        while (valueType instanceof Type.Array)
            valueType = valueType.elem as Type;
        if (valueType instanceof Type.Entity) {
            assert(typeof value === 'string' && value.startsWith(ENTITY_PREFIX));
            value = value.slice(ENTITY_PREFIX.length);
            const wikidataLabel = await this._wikidata.getLabel(value);
            assert(wikidataLabel);
            const display = closest(wikidataLabel, this._keywords);
            return new Ast.Value.Entity(value, valueType.type, display); 
        }

        throw new Error('Unsupported value type: ' + valueType);
    }

    /**
     * Creat an atom filter 
     * @param property the predicate derived from SPARQL ('id' or a wikidata entity)
     * @param value the value derived from SPARQL
     * @param operator operator, by default will be == or contains depending on the property type
     * @returns a ThingTalk filter: "$property = $value"
     */
    private async _atomFilter(property : string, value : string, operator ?: string) : Promise<Ast.AtomBooleanExpression> {
        let propertyLabel, propertyType;
        if (property === 'id') {
            propertyLabel = property;
            propertyType = new Type.Entity('org.wikidata:entity');
        } else {
            property = property.slice(PROPERTY_PREFIX.length);
            propertyLabel = this._schema.getProperty(property);
            propertyType = this._schema.getPropertyType(property);
        }
        return new AtomBooleanExpression(
            null,
            propertyLabel,
            operator ?? (propertyType instanceof Type.Array ? 'contains' : '=='),
            await this._toThingTalkValue(value, propertyType),
            null
        );
    }

    /**
     * Convert RDF triples into thingtalk filters by subjects
     * @param triples RDF Triples derived from SPARQL
     * @returns a map from subjects to their ThingTalk filters converted from the triples
     */
    private async _convertTriples(triples : any[]) : Promise<Record<string, Ast.BooleanExpression>> {
        const filtersBySubject : Record<string, Ast.BooleanExpression[]> = {};
        for (const triple of triples) {
            // if subject is an entity, create an id filter first
            if (triple.subject.termType === 'NamedNode' && triple.subject.value.startsWith(ENTITY_PREFIX)) {
                const subject = triple.subject.value;
                this._addFilter(subject, await this._atomFilter('id', subject));
            }
            // if subject is an variable and object is an entity, create a regular filter
            if (triple.subject.termType === 'Variable' && triple.object.termType === 'NamedNode') { 
                const subject = triple.subject.value;
                // for P31 triple, update the domain of the variable, do not add filter
                if (triple.predicate.termType === 'NamedNode' && triple.predicate.value === `${PROPERTY_PREFIX}P31`) {
                    this._setDomain(subject, triple.object.value.slice(ENTITY_PREFIX.length));
                    continue;
                }
                if (!(subject in filtersBySubject))
                    filtersBySubject[subject] = [];
                filtersBySubject[subject].push(await this._atomFilter(triple.predicate.value, triple.object.value));
            } 
            // if object is an variable, create a projection
            if (triple.object.termType === 'Variable') {
                const subject = triple.subject.value;
                const predicate = this._schema.getProperty(triple.predicate.value.slice(PROPERTY_PREFIX.length));
                this._addProjection(subject, { variable: triple.object.value, property: predicate });
            }
            
        }
        const converted : Record<string, Ast.BooleanExpression> = {};
        for (const [subject, filters] of Object.entries(filtersBySubject)) 
            converted[subject] = filters.length === 1 ? filters[0] : new Ast.AndBooleanExpression(null, filters);
        return converted;
    }

    /**
     * Parse a union where clause
     * @param where a where clause
     */
    private async _parseUnion(where : any)  {
        let existedSubject;
        const operands = [];
        for (const pattern of where.patterns) {
            assert(pattern.type === 'bgp');
            const filtersBySubject = await this._convertTriples(pattern.triples);
            for (const [subject, filter] of Object.entries(filtersBySubject)) {
                if (!existedSubject)
                    existedSubject = subject;
                else if (subject !== existedSubject)
                    throw new Error(`Multiple subject in filter ${where.patterns}`);
                operands.push(filter);
            }
        }
        this._addFilter(existedSubject as string, new Ast.OrBooleanExpression(null, operands));
    }

    /**
     * Parse a basic triple where clause
     * @param where a where clause
     */
    private async _parseBasic(where : any) {
        const filtersBySubject = await this._convertTriples(where.triples);
        for (const [subject, filter] of Object.entries(filtersBySubject)) 
            this._addFilter(subject, filter);  
    }

    /**
     * Parse a where clause
     * @param where a where clause
     */
    private async _parseWhereClause(where : any) {
        if (where.type === 'bgp') 
            await this._parseBasic(where);
        else if (where.type === 'union') 
            await this._parseUnion(where);
        else 
            throw new Error(`Unsupported filter ${JSON.stringify(where, undefined, 2)}`);
    }
    
    /**
     * reset tables used to track the conversion
     */
    private _reset(keywords : string[]) {
        this._tables = {};
        this._keywords = keywords.map((keyword) => this._tokenizer.tokenize(keyword).rawTokens.join(' '));
    }

    /**
     * Convert SPARQL into ThingTalk
     * @param sparql a string of SPARQL query 
     * @param keywords a list of keywords in the utterance including the mentioned entities 
     * @returns A ThingTalk Program
     */
    async convert(sparql : string, keywords : string[]) : Promise<Ast.Program> {
        this._reset(keywords);
        const parsed = this._parser.parse(sparql) as SelectQuery;
        if (parsed.where) {
            for (const clause of parsed.where) 
                await this._parseWhereClause(clause);
        }
        const queries : Ast.Expression[] = [];
        const variables = [];
        for (const variable of parsed.variables) {
            if ('value' in variable && variable.value !== '*')
                variables.push(variable.value);
            else 
                throw new Error(`Unsupported variable type: ${variable}`);
        }
        for (const [subject, Table] of Object.entries(this._tables)) {
            const projections = [];
            if (variables.includes(subject))
                projections.push('id');
            for (const projection of Table.projections) {
                if (variables.includes(projection.variable))
                    projections.push(projection.property);
            }
            if (projections.length === 0)
                continue;
            let table : Ast.Expression = baseQuery(Table.domain);
            if (Table.filters.length > 0)
                table = new Ast.FilterExpression(null, table, new Ast.BooleanExpression.And(null, Table.filters), null);
            if (!(projections.length === 1 && projections[0] === 'id'))
                table = new Ast.ProjectionExpression(null, table, projections, [], [], null);
            queries.push(table);  
        } 
        if (queries.length === 1)
            return makeProgram(queries[0]); 

        throw Error(`Not supported by ThingTalk: ${sparql}`);
    }
}

async function main() {
    const parser = new argparse.ArgumentParser({
        add_help : true,
        description : "A tool to convert QALD-7 SPARQL to ThingTalk"
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
    parser.add_argument('-i', '--input', {
        required: true,
        type: fs.createReadStream
    });
    parser.add_argument('-o', '--output', {
        required: true,
        type: fs.createWriteStream
    });
    const args = parser.parse_args();

    const manifest = await pfs.readFile(args.manifest, { encoding: 'utf8' });
    const library = ThingTalk.Syntax.parse(manifest, ThingTalk.Syntax.SyntaxType.Normal, { locale: args.locale, timezone: args.timezone });
    assert(library instanceof ThingTalk.Ast.Library && library.classes.length === 1);
    const classDef = library.classes[0];
    const converter = new SPARQLToThingTalkConverter(classDef);

    const pipeline = args.input.pipe(JSONStream.parse('questions.*'));
    pipeline.on('data', async (item : any) => {
        const thingtalk = await converter.convert(item.query.sparql, item.query.keywords.split(', '));
        args.output.write(`${item.id}\t${item.question[0].string}\t${thingtalk.prettyprint()}`);
    });
    await waitFinish(pipeline);
    await waitFinish(args.output);
    
}

if (require.main === module)
    main();
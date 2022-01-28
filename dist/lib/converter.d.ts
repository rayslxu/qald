import { Ast } from 'thingtalk';
export default class SPARQLToThingTalkConverter {
    private _schema;
    private _parser;
    private _wikidata;
    private _tokenizer;
    private _keywords;
    private _tables;
    private _variableCounter;
    constructor(classDef: Ast.ClassDef, cache: string);
    /**
     * Initialize a table (in ThingTalk) for a subject (in SPARQL)
     * @param subject the subject of the table, either a variable, or a Wikidata entity
     */
    private _initTable;
    /**
     * Add a filter to a able
     * @param subject the subject, a variable in SPARQL
     * @param filter a filter to add to the subject
     */
    private _addFilter;
    /**
     * Add a projection to a table
     * @param subject the subject, either a variable, or an entity
     * @param projection a projection to add to the subject
     */
    private _addProjection;
    /**
     * Add a verification (boolean question) to a table
     * @param subject the subject, either a variable, or an entity
     * @param verification a verification to add to the subject
     */
    private _addVerification;
    /**
     * Set the domain for a table
     * @param subject the subject, either a variable or an entity
     * @param domain the QID of the domain
     */
    private _setDomain;
    /**
     * @return a new sparqljs compatible variable
     */
    private _newVariable;
    /**
     * Convert a value in SPARQL into a ThingTalk value
     * @param value a value in the SPARQL triple
     * @param type the ThingTalk type of the value
     * @returns a ThingTalk value
     */
    private _toThingTalkValue;
    /**
     * Creat an atom filter
     * @param property the predicate derived from SPARQL (either a name or a Wikidata property)
     * @param value the value derived from SPARQL
     * @param operator operator, by default will be == or contains depending on the property type
     * @param valueType the type of the value
     * @returns a ThingTalk filter: "$property = $value"
     */
    private _atomFilter;
    private _aggregateFilter;
    private _convertSequencePathTriple;
    private _convertBasicTriple;
    /**
     * Convert RDF triples into thingtalk filters by subjects
     * @param triples RDF Triples derived from SPARQL
     * @returns a map from subjects to their ThingTalk filters converted from the triples
     */
    private _convertTriples;
    /**
     * Parse a union where clause
     * @param where a where clause
     */
    private _parseUnion;
    /**
     * Parse a filter clause
     * @param filter a filter clause
     * @param isVerification if it's a verification question or not
     */
    private _parseFilter;
    /**
     * Parse a basic triple where clause
     * @param where a where clause
     */
    private _parseBasic;
    /**
     * Parse a where clause
     * @param where a where clause
     * @param isVerification if it's a verification question or not
     */
    private _parseWhereClause;
    private _parseHavingClause;
    /**
     * reset tables used to track the conversion
     */
    private _reset;
    /**
     * Convert SPARQL into ThingTalk
     * @param sparql a string of SPARQL query
     * @param keywords a list of keywords in the utterance including the mentioned entities
     * @returns A ThingTalk Program
     */
    convert(sparql: string, keywords: string[]): Promise<Ast.Program>;
}

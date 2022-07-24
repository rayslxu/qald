export declare const ENTITY_PREFIX = "http://www.wikidata.org/entity/";
export declare const PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
export declare const PROPERTY_PREDICATE_PREFIX = "http://www.wikidata.org/prop/";
export declare const PROPERTY_STATEMENT_PREFIX = "http://www.wikidata.org/prop/statement/";
export declare const PROPERTY_QUALIFIER_PREFIX = "http://www.wikidata.org/prop/qualifier/";
export declare const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
export default class WikidataUtils {
    private _wdk;
    private _schemaorg;
    private _cachePath;
    private _cache;
    private _bootleg;
    private _cacheLoaded;
    private _domains;
    private _subdomains;
    private _domainSize;
    private _properties;
    constructor(cachePath: string, bootlegPath: string);
    get subdomains(): Record<string, string[]>;
    /**
     * Load or create sqlite database for caching
     */
    private _loadOrCreateSqliteCache;
    /**
     * Get cache
     * @param table the name of the table
     * @param field the filed of projection
     * @param constraint the constraint to apply to the retrieval
     * @returns undefined if not found, otherwise in the format of { result : string }
     */
    private _getCache;
    /**
     * Set cache
     * @param table the name of the table
     * @param values all the values to add to the table
     * @returns undefined
     */
    private _setCache;
    /**
     * Obtain results of a SPARQL query against Wikidata SPARQL endpoint
     * @param sparql a SPARQL query
     * @returns A list of the results
     */
    private _query;
    /**
     * Obtain results of URL in JSON form (Wikibase API call)
     * @param url
     * @param caching enable caching for the request or not
     * @returns An object of the result
     */
    private _request;
    /**
     * Obtain the values of property for a given entity
     * @param entityId QID of an entity
     * @param propertyId PID of an entity
     * @returns values of the property
     */
    getPropertyValue(entityId: string, propertyId: string): Promise<string[]>;
    /**
     * Get the domain of a given entity:
     * if there are multiple domains, pick the one that has the most instances;
     * @param entityId QID of an entity
     * @param excludes a list of domains (QIDs) that we want to exclude, this is used to
     *                 to provide alternative domain when properties are not available
     * @returns the QID of the domain of the entity
     */
    getDomain(entityId: string, excludes?: string[]): Promise<string | null>;
    /**
     * Get the Wikidata label for an entity or a property
     * @param id QID or PID
     * @returns natural language label in English
     */
    getLabel(id: string): Promise<string | null>;
    /**
     * Get the Wikidata alt label for an entity or a property
     * @param id QID or PID
     * @returns an array of alternative labels in English
     */
    getAltLabels(id: string): Promise<string[]>;
    /**
     * Get the wikidata label for a list of entities/properties.
     * The API allows up to 50 entities/properties at a time.
     * @param qids a list of QIDs or PIDs
     * @returns A map from id to label
     */
    getLabelsByBatch(...ids: string[]): Promise<Record<string, string | null>>;
    /**
     * Get example entities for the given domain
     *
     * Examples are sorted based on sitelinks.
     * Order by sitelinks in human (Q5), painting (Q3305213), and taxon (Q16521) domain
     * will lead to timeout, thus handle these three domains specially
     *
     * @param domain QID of the domain
     * @param limit the maximum number of entities to return
     * @returns an array of QIDs belongs to the given domain
     */
    getEntitiesByDomain(domain: string, limit?: number): Promise<string[]>;
    /**
     * Get properties for a given domain
     *
     * First get 100 example entities in the domain, and then extract all properties
     * they use
     *
     * @param domain QID of the domain
     * @param includeNonEntityProperties include properties whose values are not Wikidata entities
     * @returns an array of PIDs belongs to the given domain
     */
    getDomainProperties(domain: string, includeNonEntityProperties?: boolean): Promise<string[]>;
    /**
     * Given a domain and a property, find if the property qualifiers
     * @param domain QID
     * @param property PID
     * @returns a list of qualifiers PID
     */
    getQualifiersByProperty(property: string): Promise<string[]>;
    /**
     * Get properties and their values for a given domain
     *
     * First get 100 example entities in the domain, and then extract all properties
     * they use and their values
     *
     * @param domain QID of the domain
     * @param includeNonEntityProperties include properties whose values are not Wikidata entities
     * @returns an object where key is property PID, values are either an array of string/entity objects, or a type
     */
    getDomainPropertiesAndValues(domain: string, includeNonEntityProperties?: boolean): Promise<Record<string, any>>;
    /**
     * Get properties that are marked as "Wikidata property with datatype 'time'"
     *
     * @returns a list of property ids
     */
    getTimeProperties(): Promise<any>;
    /**
     * Get the allowed units (Q21514353) of a property
     * This allows to detect Measure types
     *
     * @param propertyId
     * @returns A list of allowed units
     */
    getAllowedUnits(propertyId: string): Promise<string[]>;
    /**
     * Get range constraint
     *
     * @param propertyId
     * @returns range or null
     */
    getRangeConstraint(propertyId: string): Promise<Record<string, number> | null>;
    /**
     * Return
     * @param propertyId
     * @returns wikibaseType
     */
    getPropertyType(propertyId: string): Promise<string>;
    /**
     * the number of entities in this domain
     * @param domain QID of a domain
     */
    getDomainSize(domain: string): Promise<number>;
    /**
     * Get all the domains to include in the schema
     * @returns the domains
     */
    loadAllDomains(minimum_size?: number): Promise<void>;
    _loadSubdomains(): Promise<void>;
    /**
     * Return the top-level parent domains given a subdomain
     * this only returns domains that are included in the manifest
     * @param qids a list of QIDs
     */
    getTopLevelDomains(...qids: string[]): Promise<string[]>;
    /**
     * Return the immediate parent domains given a subdomain
     * this returns all domains in wikidata, including those not in the manifest
     * @param qids a list of QIDs
     * @returns a list of parent class QIDs
     */
    getParentDomains(...qids: string[]): Promise<string[]>;
    /**
     * Return one top-level domain given a subdomain
     * The returned one is considered the default domain to choose a function
     * unless there are some properties not available for the domain
     *
     * It iteratively check the immediate parent domains and find a domain that
     * is included in the top-level domains. If there are multiple, some heuristics
     * is used to order the candidates
     *
     * @param qids a list of QIDs
     * @param excludes a list of domains (QIDs) we want to exclude from the result
     * @returns the default to-level domain
     */
    getTopLevelDomain(qids: string[], excludes?: string[]): Promise<string>;
    /**
     * guess if the thingtalk type of a value is string
     * @param value a string of value
     * @returns if the value is a string value
     */
    isStringValue(value: string): boolean;
    /**
     * guess if the thingtalk type of a value is number
     * @param value a string of value
     * @returns if the value is a number value
     */
    isNumber(value: string): boolean;
    /**
     * guess if the thingtalk type of a value is entity
     * @param value a string of value
     * @returns if the value is a entity value
     */
    isEntity(value: string): boolean;
}

import { Ast, Type } from 'thingtalk';
/**
 * A class to retrieve schema information from the schema
 */
export declare class WikiSchema {
    private _tableMap;
    private _propertyMap;
    private _propertyTypeMap;
    constructor(schema: Ast.ClassDef);
    /**
     * @param qid QID of a domain
     * @returns the table name (cleaned label of the QID)
     */
    getTable(qid: string): string;
    /**
     * @param pid PID of a property
     * @returns the property name (cleaned label of the PID)
     */
    getProperty(pid: string): string;
    /**
     * @param property the name of the property
     * @returns the entity type of the property
     */
    getPropertyType(property: string): Type;
}

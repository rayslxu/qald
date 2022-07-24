export declare const SCHEMAORG_PREFIX = "https://schema.org/";
export declare const LEVEL1_DOMAINS: string[];
export declare class SchemaorgType {
    id: string;
    name: string;
    private _depth?;
    private _subclass_of;
    constructor(id: string, name: string, subclass_of: SchemaorgType[]);
    addParentType(type: SchemaorgType): void;
    isSubclassOf(type: string, maxDepth?: number): boolean;
    get depth(): number;
}
export default class SchemaorgUtils {
    private _types;
    constructor();
    _init(): Promise<void>;
    types(maxDepth?: number): Promise<SchemaorgType[]>;
}

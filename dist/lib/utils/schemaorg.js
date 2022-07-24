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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaorgType = exports.LEVEL1_DOMAINS = exports.SCHEMAORG_PREFIX = void 0;
const Tp = __importStar(require("thingpedia"));
exports.SCHEMAORG_PREFIX = 'https://schema.org/';
const SCHEMA_JSON = 'https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/14.0/schemaorg-current-https.jsonld';
// All level 1 domains in schema.org except for Action and Intangible
exports.LEVEL1_DOMAINS = [
    'CreativeWork',
    'Event',
    'MedicalEntity',
    'Organization',
    'Person',
    'Place',
    'Product'
];
class SchemaorgType {
    constructor(id, name, subclass_of) {
        this.id = id;
        this.name = name;
        this._subclass_of = subclass_of;
    }
    addParentType(type) {
        this._subclass_of.push(type);
    }
    isSubclassOf(type, maxDepth = Infinity) {
        if (maxDepth < 0)
            return false;
        if (this.name === type)
            return true;
        if (!this._subclass_of)
            return false;
        for (const parent of this._subclass_of) {
            if (parent.isSubclassOf(type, maxDepth - 1))
                return true;
        }
        return false;
    }
    get depth() {
        if (this._depth)
            return this._depth;
        if (this.name === 'Thing')
            return 0;
        const parentDepths = this._subclass_of.map((t) => t.depth);
        return Math.min(...parentDepths) + 1;
    }
}
exports.SchemaorgType = SchemaorgType;
class SchemaorgUtils {
    constructor() {
        this._types = {};
    }
    async _init() {
        const raw = await Tp.Helpers.Http.get(SCHEMA_JSON, { accept: 'application/json' });
        const parsed = JSON.parse(raw);
        // load types
        for (const item of parsed['@graph']) {
            const id = item['@id'];
            const name = item['rdfs:label'];
            if (item['@type'] === 'rdfs:Class')
                this._types[id] = new SchemaorgType(id, name, []);
        }
        // load subclasses
        for (const item of parsed['@graph']) {
            const id = item['@id'];
            if (!(id in this._types))
                continue;
            let parentTypes = item['rdfs:subClassOf'];
            if (!parentTypes)
                continue;
            if (!Array.isArray(parentTypes))
                parentTypes = [parentTypes];
            for (const parentType of parentTypes) {
                const schemaType = this._types[parentType['@id']];
                if (schemaType)
                    this._types[id].addParentType(schemaType);
            }
        }
    }
    async types(maxDepth = Infinity) {
        if (Object.keys(this._types).length === 0)
            await this._init();
        return Object.values(this._types).filter((t) => t.isSubclassOf('Thing', maxDepth) &&
            exports.LEVEL1_DOMAINS.some((d) => t.isSubclassOf(d)) || t.name === 'Thing');
    }
}
exports.default = SchemaorgUtils;
//# sourceMappingURL=schemaorg.js.map
import * as Tp from 'thingpedia';
import * as ThingTalk from 'thingtalk';
interface PostProcessorOptions {
    tpClient: Tp.BaseClient;
    schemas: ThingTalk.SchemaRetriever;
    includeEntityValue: boolean;
    excludeEntityDisplay: boolean;
}
export declare class PostProcessor {
    private _tpClient;
    private _schemas;
    private _includeEntityValue;
    private _excludeEntityDisplay;
    constructor(options: PostProcessorOptions);
    private _hasIdFilter;
    private _postprocessBooleanExpression;
    private _postprocessExpression;
    postprocess(thingtalk: string, preprocessedUtterance: string): Promise<string[]>;
}
export {};

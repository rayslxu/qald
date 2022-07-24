export interface Example {
    id: string;
    utterance: string;
    sparql: string;
}
/**
 * Preprocess one QALD example to extract only useful information for us
 * @param example An example in QALD
 * @returns A cleaned example object with id, utterance, and sparql
 */
export declare function preprocessExample(example: any): Example;
/**
 * Preprocess all QALD train/test examples into a cleaned array
 * @returns An array of examples
 */
export declare function preprocessQALD(experiment: string): Example[];
/**
 * In some examples of QALD-7, an entity span is splitted into multiple keywords,
 * manually override them to recover
 */
export declare const ENTITY_SPAN_OVERRIDE: Record<string, string>;
export declare const MANUAL_CONVERSION_WITH_DISPLAY: Record<string, string>;
export declare const MANUAL_CONVERSION_WITHOUT_DISPLAY: Record<string, string>;

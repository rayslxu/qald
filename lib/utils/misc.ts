import stemmer from 'en-stemmer';
import fs from 'fs';
import JSONStream from 'JSONStream';
import { removeStopwords } from 'stopword';

export function snakeCase(v : string) {
    return v.trim().replace(/[() _-]+/g, '_').toLowerCase();
}

export function removeAccent(v : string) {
    return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function removeEndPunctuation(v : string) {
    return v.replace(/[.!?]$/g, '');
}

export function cleanName(v : string) {
    // replace '(s)' to simply 's'
    v = v.replace(/\(s\)/g, 's');
    v = snakeCase(v);
    // replace u.s. to us
    v = v.replace(/u\.s\./g, 'us');
    // remove accents
    v = removeAccent(v);
    // replace any special tokens to underscore
    v = v.replace(/[^1-9a-zA-Z]/g, '_').replace(/__/g, '_');
    return v;
}

export async function loadJson(file : string) : Promise<Record<string, any>> {
    const data : Record<string, any> = {};
    const pipeline = fs.createReadStream(file).pipe(JSONStream.parse('$*'));
    pipeline.on('data', (item : { key : string, value : any}) => {
        data[item.key] = item.value;
    });
    pipeline.on('error', (error : Error) => console.error(error));
    await waitEnd(pipeline);
    return data;
}

export function waitFinish(stream : NodeJS.WritableStream) : Promise<void> {
    return new Promise((resolve, reject) => {
        stream.once('finish', resolve);
        stream.on('error', reject);
    });
}

export function waitEnd(stream : NodeJS.ReadableStream) : Promise<void> {
    return new Promise((resolve, reject) => {
        stream.once('end', resolve);
        stream.on('error', reject);
    });
}

// similarity by word-level similarity
export function similarity(s1 : string, s2 : string, algorithm : 'jaccard'|'f1' = 'f1') {
    function clean(s : string) : string {
        return stemmer(removeAccent(s));
    }
    const arr1 = removeStopwords(s1.toLowerCase().split(' ')).map(clean);
    const arr2 = removeStopwords(s2.toLowerCase().split(' ')).map(clean);

    if (arr1.length === 0 || arr2.length === 0)
        return 0;

    const intersect = arr1.filter((v) => arr2.includes(v));
    if (algorithm === 'jaccard') {
        const union = [...new Set([...arr1, ...arr2])];
        return intersect.length / union.length;
    } else {
        const precision = intersect.length / arr1.length;
        const recall = intersect.length / arr2.length;
        if (precision === 0 || recall === 0)
            return 0;
        return 2 * precision * recall / (precision + recall);
    }
}

// return most similar one by word-level similarity
export function closest(s : string, arr : string[], algorithm : 'jaccard'|'f1' = 'f1', discard_threshold = 0) {
    let closest = null;
    let maxSimilarity = -1;
    for (const candidate of arr) {
        const score = similarity(s, candidate, algorithm);
        if (score <= discard_threshold)
            continue;
        if (score > maxSimilarity) {
            maxSimilarity = score;
            closest = candidate;
        }
    }
    return closest;
}

// return all possible spans of a sentence
export function getSpans(s : string) : string[] {
    const spans = [];
    const tokens = removeEndPunctuation(s).split(/\s+/);
    for (let len = 1; len <= tokens.length; len ++) {
        for (let index = 0; index <= tokens.length - len; index ++)
            spans.push(tokens.slice(index, index + len).join(' '));
    }
    return spans;
}
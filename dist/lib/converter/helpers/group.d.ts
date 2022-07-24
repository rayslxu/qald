import { Expression, Grouping } from 'sparqljs';
import SPARQLToThingTalkConverter from '../sparql2thingtalk';
export default class GroupParser {
    private _converter;
    constructor(converter: SPARQLToThingTalkConverter);
    private _aggregateFilter;
    parse(having: Expression, group: Grouping): Promise<void>;
}

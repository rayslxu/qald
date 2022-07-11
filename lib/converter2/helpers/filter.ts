import { Ast } from 'thingtalk';
import { FilterPattern } from 'sparqljs';
import {
    ArrayCollection
} from '../../utils/misc';
import SPARQLToThingTalkConverter from '../sparql2thingtalk';

export default class FilterConverter {
    private _converter : SPARQLToThingTalkConverter;

    constructor(converter : SPARQLToThingTalkConverter) {
        this._converter = converter;
    }

    async convert(filter : FilterPattern) : Promise<ArrayCollection<Ast.BooleanExpression>> {
        console.log(this._converter);
        throw new Error('TODO: handle filters');
    }
}
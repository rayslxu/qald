/**
 schema:
 create table type (
    id varchar(16) primary key,
    type varchar(100)
);
 */
export default class BootlegUtils {
    private _db;
    constructor(path: string);
    getType(id: string): Promise<string | null>;
}

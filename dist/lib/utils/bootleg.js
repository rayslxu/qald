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
const sqlite3 = __importStar(require("sqlite3"));
/**
 schema:
 create table type (
    id varchar(16) primary key,
    type varchar(100)
);
 */
class BootlegUtils {
    constructor(path) {
        this._db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE);
    }
    async getType(id) {
        const result = await new Promise((resolve, reject) => {
            const sql = `select type from type where id = ?`;
            this._db.get(sql, id, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        if (result && result.type)
            return result.type;
        return null;
    }
}
exports.default = BootlegUtils;
//# sourceMappingURL=bootleg.js.map
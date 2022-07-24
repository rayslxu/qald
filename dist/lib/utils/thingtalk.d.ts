import { Ast, Type } from 'thingtalk';
export declare function idArgument(entityType: string): Ast.ArgumentDef;
export declare function instanceOfArgument(entityType: string): Ast.ArgumentDef;
export declare function isIdFilter(filter: Ast.BooleanExpression): boolean;
/**
 * A shortcut for quickly creating a basic query
 * @param domain the name of a domain
 * @return an invocation of a base domain query (no projection, no filter)
 */
export declare function baseQuery(domain: string): Ast.InvocationExpression;
/**
 * A shortcut for creating a program from an query expression
 * @param expression a ThingTalk query expression
 * @returns a ThingTalk program
 */
export declare function makeProgram(expression: Ast.Expression): Ast.Program;
/**
 * A shortcut for creating a program with a subquery
 * @param main the main query
 * @param subquery the subquery
 * @returns a ThingTalk program
 */
export declare function makeSubqueryProgram(main: Ast.Expression, subquery: Ast.BooleanExpression): Ast.Program;
/**
 * A shortcut for creating a program with subquery verification
 * @param main the main query
 * @param subqueries the boolean expressions to verify
 */
export declare function makeSubqueryVerificationProgram(main: Ast.Expression, subqueries: Ast.BooleanExpression[]): Ast.Program;
/**
 * Get the element type of a ThingTalk type
 * @param type a ThingTalk type
 * @param resolveCompound if true, return the `value` field type, otherwise, return the compound type
 */
export declare function elemType(type: Type, resolveCompound?: boolean): Type;
/**
 * Given a filter return the properties used for the table
 * @param filter a filter
 */
export declare function getPropertiesInFilter(filter: Ast.BooleanExpression): string[];

import { ErrResult, Result } from 'cs544-js-utils';

/** a raw grade sheet entry is a number or string;
 *  missing info is specified as an empty string ''.
 *  cannot be undefined or null.
 */
export type RawData = number | string;

/** a RawRow is a map from column Id's to RawData */
export type RawRow = {
  [ colId: string ]: RawData;
}

/** a raw table is a sequence of raw rows */
export type RawTable = RawRow[];

/** a grade can be raw data or a computed value which may be in error */
export type Grade = RawData  | ErrResult;
/** a grade row is a map from column Id's to a Grade */ 
export type GradeRow = {
  [ colId: string ]: Grade;
}
/** a full table is a sequence of grade rows */
export type FullTable = GradeRow[];

/** A patch specifies the RawData value to be applied to coordinates
 *  [rowId, colId].
 */
export type Patches = {
  [rowId: string]: { [colId: string]: RawData }
};

/** Header used for columns containing headers for col stats */
export const STAT_HDR = '$stat';

export interface Grades {


  /** Return a raw table containing the raw data.  Note that all
   *  columns in each retrieved row must be in the same order
   *  as the order specified in the course-info cols property.
   *  There is no requirement on the ordering of the rows.
   */
  getRawTable(): RawTable;

  /** Return full table containing all computed values for these grades. */
  getFullTable(): FullTable;

  /** the following operations do not mutate this, instead they
   *  return a new instance of Grades.
   */

  /** Upsert (i.e. insert or replace) row to table and return the new
   *  table.  Note that this Grades object should not be 
   *  modified at all.  The returned Grades may share structure with
   *  this Grades object  and row being upserted.
   *
   *  Error Codes:
   *
   *   'BAD_ARG': row specifies an unknown colId or a calc colId or
   *              contains an extra/missing colId not already in table,
   *              or is missing an id column identifying the row.
   *   'RANGE':   A kind='score' column value is out of range
   */
  upsertRow(row: RawRow) : Result<Grades>;


  /** Add an empty column for colId to table. Note that this Grades
   *  object should not be changed.
   *  Errors:
   *    BAD_ARG: colId is already in table or is not a score/info/id colId
   *    for course.
   */
  addColumn(colId: string) : Result<Grades>;
  
  /** Apply patches to table, returning the patched table.
   *  Note that this Grades object is not changed.
   *  Errors:
   *    BAD_ARG: A patch rowId or colId is not in table.
   *    RANGE: Patch data is out-of-range.
   */
  patch(patches: Patches): Result<Grades>;

}

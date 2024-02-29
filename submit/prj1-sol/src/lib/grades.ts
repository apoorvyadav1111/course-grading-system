import * as C from './course-info.js';
import * as G from './grade-table.js';
import { okResult, errResult, ErrResult, Result } from 'cs544-js-utils';

export default function makeGrades(course: C.CourseInfo) : G.Grades {
  return GradesImpl.make(course);
}

type RawRowsMap = { [rowId: string]:  G.RawRow }; 

class GradesImpl implements C.CourseObj, G.Grades {
  readonly course: C.CourseInfo;
  readonly #colIds: Set<string>;
  readonly #rawRowsMap: RawRowsMap;
  #fullTable: G.FullTable;

  static make(course: C.CourseInfo) : G.Grades {
    return new GradesImpl(course);
  }

  private constructor(course: C.CourseInfo, colIds: Set<string> =null,
		      rawRowsMap: RawRowsMap = null) {
    //uncomment following line if no ts files shown in chrome debugger
    //debugger 
    this.course = course;
    this.#colIds = colIds;
    this.#rawRowsMap = rawRowsMap;
    this.#fullTable = null;
  }

  /** Add an empty column for colId to table. Note that this Grades
   *  object should not be changed.
   *  Errors:
   *    BAD_ARG: colId is already in table or is not a score/info/id colId
   *    for course.
   */
  addColumn(colId: string) : Result<G.Grades> {
    const cols = this.course.cols;
    let err = new ErrResult();
    if(this.#colIds.has(colId)){
      err = err.addError(`new column ${colId} already in table`,'BAD_ARG');
    }
    const colProp = cols[colId]
    if(colProp===undefined){
      err = err.addError(`unknown column ${colId}`, 'BAD_ARG');
    }
    else if(colProp.kind ==='calc'){
      err = err.addError(`attempt to add data for calculated column ${colId}`,
      'BAD_ARG');
    }
    if(err.errors.length>0){
      return err;
    }
    const newColIds = new Set([...this.#colIds, colId].sort((colId1, colId2) => cols[colId1].colIndex - cols[colId2].colIndex));
    const allRowsPairs = Object.keys(this.#rawRowsMap).map((rowId) => {
      const row = {...this.#rawRowsMap[rowId], ...{[colId]:''}};
      const row1Pairs = Object.keys(row)
      .sort((colId1, colId2) => cols[colId1].colIndex - cols[colId2].colIndex)
      .map(colId => [colId, row[colId]]);
      return [rowId, Object.fromEntries(row1Pairs)];
    });
    const allRows = Object.fromEntries(allRowsPairs);
    return okResult(new GradesImpl(this.course, newColIds, allRows));
  }

  /** Apply patches to table, returning the patched table.
   *  Note that this Grades object is not changed.
   *  Errors:
   *    BAD_ARG: A patch rowId or colId is not in table.
   *    RANGE: Patch data is out-of-range.
   */
  patch(patches: G.Patches): Result<G.Grades> {
    let err = new ErrResult();
    const rowIds = Object.keys(this.#rawRowsMap);
    const patchRowIds = Object.keys(patches);
    const addRowIds = patchRowIds.filter(rowId => rowIds.indexOf(rowId)<0);
    if(addRowIds.length>0){
      err = err.addError(`unknown rowId ${addRowIds.join(', ')}`, 'BAD_ARG');
    }
    const cols = this.course.cols;
    for(const [rowId, row] of Object.entries(patches)){
      for(const [patchColId, val] of Object.entries(row)){
        const patchColProp = cols[patchColId];
        if(patchColProp===undefined){
          err = err.addError(`unknown column ${patchColId}`, 'BAD_ARG');
        }
        else if(!this.#colIds.has(patchColId)){
          err = err.addError(`new column ${patchColId}`, 'BAD_ARG');
        }
        if(patchColProp.kind==='calc'){
          err = err.addError(`attempt to add data for calculated column ${patchColId}`,
          'BAD_ARG');}
        else if (patchColProp.kind === 'id'){
          err = err.addError(`attempt to add id ${patchColId}`,
          'BAD_ARG');
        }
        else if(patchColProp.kind=='score'){
          const {min, max} = patchColProp
          if(typeof val === 'number' && (val>max || val<min)){
            const msg = `${patchColId} value ${val} out of range [${min}, ${max}]`;
            err = err.addError(msg, 'RANGE');
          }
        }
      }
    }
    if(err.errors.length>0){
      return err;
    }else{
      const allPatchesPair = Object.keys(patches).map((rowId)=>{
        const row = {...this.#rawRowsMap[rowId], ...patches[rowId]};
        return [rowId,row];
      })
      const allPatches = Object.fromEntries(allPatchesPair);
      const rawRowsMap = {...this.#rawRowsMap, ...allPatches};
      return okResult(new GradesImpl(this.course, this.#colIds, rawRowsMap)); 

    }
  }

  /** Return full table containing all computed values */
  getFullTable(): G.FullTable {
    if(this.#fullTable!==null){
      return this.#fullTable;
    }else{
      const cols = this.course.cols;
      const allRows = this.#rawRowsMap;
      
      const allRowsPairs = Object.keys(allRows).map((rowId)=>{
        const rowPairs = Object.keys(allRows[rowId]).map((colId)=>[colId,allRows[rowId][colId]]);
        const row = Object.fromEntries(rowPairs);
        Object.keys(this.course.cols).map(colId => {
          const colProp = this.course.cols[colId]
          if(colProp.kind==='calc'){
            const res = colProp.fn(this.course, row)
            if(res.isOk===true){
              row[colId] = res.val
            }else if(res.isOk===false){
              row[colId] = res.errors[0].options.code
            }
          }
        });
        row[G.STAT_HDR] = '';
        const sortedRows = Object.keys(row)
        .sort((colId1, colId2) => (colId1!==G.STAT_HDR && colId2!==G.STAT_HDR)?cols[colId1].colIndex - cols[colId2].colIndex:(colId1===G.STAT_HDR?-1:1))
        .map((colId) => [colId, row[colId]]);
        const newRow = Object.fromEntries(sortedRows);
        return [rowId, newRow];
      });
      const existingCols = Object.keys(allRowsPairs[0][1]);
      const allNewRows = Object.fromEntries(allRowsPairs);
      const AllCalcRowsPairs = Object.keys(this.course.calcRows).map((calcRowId) => {
        const calcRow = existingCols.map((colId)=>{
          if(colId==='$stat'){
            return [G.STAT_HDR,calcRowId];
          }
          else if(cols[colId].kind==='calc' || cols[colId].kind==='score'){
            const gradeCol = Object.keys(allNewRows).map((rowId)=>{
              return allNewRows[rowId][colId];
            })
            const res = this.course.calcRows[calcRowId].fn(this.course, gradeCol)
            if(res.isOk===true){
              return [colId, res.val];
            }else if(res.isOk===false){
              return [colId,res.errors[0].options.code];
            }
          }else{
            return [colId, ''];
        }});
        const calcRowMap = Object.fromEntries(calcRow);
        const calcRowSortedPairs = Object.keys(calcRowMap)
        .sort((colId1, colId2) => (colId1!==G.STAT_HDR && colId2!==G.STAT_HDR)?cols[colId1].colIndex - cols[colId2].colIndex:(colId1===G.STAT_HDR?-1:1))
        .map((colId) => [colId, calcRowMap[colId]]);

        const calcRowSorted = Object.fromEntries(calcRowSortedPairs);
        return [calcRowId, calcRowSorted];
      });
      const AllCalcRows = Object.fromEntries(AllCalcRowsPairs);
      return Object.values({...allNewRows, ...AllCalcRows});
    }
  }

  /** Return a raw table containing the raw data.  Note that all
   *  columns in each retrieved row must be in the same order
   *  as the order specified in the course-info cols property.
   */
  getRawTable(): G.RawTable {
    return this.#colIds === null ? [] : Object.values(this.#rawRowsMap);
  }
  
  /** Upsert (i.e. insert or replace) row to table and return the new
   *  table.  Note that this Grades object should not be 
   *  modified at all.  The returned Grades may share structure with
   *  this Grades object  and row being upserted.
   *
   *  Error Codes:
   *
   *   'BAD_ARG': row specifies an unknown colId or a calc colId or
   *              contains an extra/missing colId not already in table,
   *              or is missing an id column course.colidentifying the row.
   *   'RANGE':   A kind='score' column value is out of range
   */
  upsertRow(row: G.RawRow) : Result<G.Grades> {
    const cols = this.course.cols;
    const rowColIds = Object.keys(row);
    const colIds = (this.#colIds) ? this.#colIds : new Set<string>(rowColIds);
    const addColIds = rowColIds.filter(colId => !colIds.has(colId));
    const missColIds =
      [ ...colIds ].filter(colId => rowColIds.indexOf(colId) < 0);
    let err = new ErrResult();
    //console.log(colIds, rowColIds, addColIds, missColIds);
    if (addColIds.length > 0) {
      err = err.addError(`new columns ${addColIds.join(', ')}`, 'BAD_ARG');
    }
    if (missColIds.length > 0) {
      err = err.addError(`missing columns ${missColIds.join(', ')}`, 'BAD_ARG');
    }
    let rowId: string;
    for (const [colId, val] of Object.entries(row)) {
      if (val === undefined || val === null) {
	const msg = `${colId} is ${row[colId] === null ? 'null' : 'undefined'}`;
	err = err.addError(msg, 'BAD_ARG');
      }
      const colProp = cols[colId];
      if (colProp === undefined) {
	err = err.addError(`unknown column ${colId}`, 'BAD_ARG');
      }
      else if (colProp.kind === 'id') {
	if (typeof val === 'string') rowId = val as string;
      }
      else if (colProp.kind === 'calc') {
	err = err.addError(`attempt to add data for calculated column ${colId}`,
			   'BAD_ARG');
      }
      else if (colProp.kind === 'score') {
	const {min, max} = colProp;
	const val = row[colId];
	if (typeof val === 'number' && (val < min || val > max)) {
	  const msg = `${colId} value ${val} out of range [${min}, ${max}]`;
	  err = err.addError(msg, 'RANGE');
	}
      }
    }
    if (rowId === undefined) {
      err = err.addError(`no entry for ID column ${this.course.rowIdColId}`,
			 'BAD_ARG');
    }
    if  (err.errors.length > 0) {
      return err;
    }
    else {
      const row1Pairs = Object.keys(row)
	.sort((colId1, colId2) => cols[colId1].colIndex - cols[colId2].colIndex)
	.map(colId => [colId, row[colId]]);
      const row1 = Object.fromEntries(row1Pairs);
      const rawRowsMap = { ...this.#rawRowsMap, ...{ [rowId]: row1 } };
      return okResult(new GradesImpl(this.course, colIds, rawRowsMap));
    }

  } //upsertRow

  //TODO: add auxiliary private methods as needed
}

//TODO: add auxiliary functions as needed
function clone(o: Object) : Object {
  return JSON.parse(JSON.stringify(o));
}
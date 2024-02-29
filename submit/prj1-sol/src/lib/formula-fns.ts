import { Result, ErrResult, errResult, okResult } from 'cs544-js-utils';

import * as C from './course-info.js';
import * as G from './grade-table.js';

function selectColsFromRow(colIds: string[], row: G.GradeRow) : G.Grade[] {
  //no DataRow entry should be undefined; hence if row[colId] is
  //undefined, then it must be the case that colId corresponds to
  //an assignment which has not yet been graded
  return colIds
    .filter(colId => row[colId] !== undefined)
    .map(colId =>  row[colId] || 0); //convert missing grade '' to 0
}

export function categoryDropAvg(category: string, nDrop: number = 1)
  : C.RowFn
{
  return (course: C.CourseInfo, row: G.GradeRow) => {
    const colIds = Object.values(course.cols)
      .filter(c => c.kind === 'score' && c.category === category)
      .map(c => c.colId);
    if (colIds.length == 0) {
      return errResult(`no cols for category ${category}`, 'BAD_ARG');
    }
    const cVals = selectColsFromRow(colIds, row);
    const vals: number[] = (cVals.map(d => d === '' ? 0 : d)) as number[];
    const droppedVals = vals
      .sort((a, b) => a - b)
      .slice(nDrop);
    const nVals = droppedVals.length;
    const ret = (nVals === 0) ? 0 : droppedVals.reduce((acc, v) => acc+v)/nVals;
    return okResult(ret);
  };
}

type WtObj = { [col: string] : number } | number;
type Weights = { [col: string ] : WtObj };

function weight(weights: WtObj, ...keys: string[]) : number {
  let w = weights;
  let i = 0;
  while (typeof w !== 'number') { w = w[keys[i++]]; }
  return w;
}

/** Returns Result<colVals> for specified colIds.  Returns error result
 *  if column value for some colId is undefined or already in error.
 */
function getColVals(row: G.GradeRow, colIds: string[]) : Result<G.RawData[]> {
  return colIds
    .reduce((result: Result<G.RawData[]>, colId: string) => {
      return result.chain((vals: G.RawData[]) => {
	const val = row[colId];
	return (
	  (val === undefined)
	    ? errResult(`no value for ${colId}`, 'BAD_ARG')
	    : (typeof val === 'object') //val instanceof ErrObject
	    ? val
	    : okResult(vals.concat(val))
	);
      });
    }, okResult([]));
}

export function weightedSum(weights: Weights, ...extraKeys: string[])
  : C.RowFn 
{
  return (course: C.CourseInfo, row: G.GradeRow) => {
    const colValsResult = getColVals(row, Object.keys(weights));
    if (!colValsResult.isOk) return colValsResult as Result<G.RawData>;
    const colVals = colValsResult.val.map(v => typeof v === 'number' ? v : 0);
    const extraKeyValsResult = getColVals(row, extraKeys); 
    if (!extraKeyValsResult.isOk) {
      return extraKeyValsResult as Result<G.RawData>;
    }
    const extraKeyVals = extraKeyValsResult.val.map(v => String(v));
    const wts = Object.values(weights).map(w => weight(w, ...extraKeyVals));
    console.assert(colVals.length === wts.length);
    const wtSum : G.RawData  = colVals.reduce((sum, v, i) => sum + wts[i]*v, 0);
    return okResult(wtSum);
  }
}
   

// Column functions

function cleanCol(colVals: G.Grade[]) : Result<number[]> {
  const err = colVals.find(v => v instanceof ErrResult) as Result<number[]>;
  if (err) return err;
  return okResult(colVals.filter(v => typeof v === 'number') as number[]);
}

export function colMax(course: C.CourseInfo, colData: G.Grade[])
  : Result<number>
{
  return cleanCol(colData)
    .chain((vals: number[]) => okResult(Math.max(...vals)));
}

export function colMin(course: C.CourseInfo, colData: G.Grade[])
  : Result<number>
{
  return cleanCol(colData)
    .chain((vals: number[]) => okResult(Math.min(...vals)));
}


export function colCount(course: C.CourseInfo, colData: G.Grade[])
  : Result<number>
{
  return cleanCol(colData)
    .chain((vals: number[]) => okResult(vals.length));
}

export function colAvg(course: C.CourseInfo, colData: G.Grade[])
  : Result<number>
{
  return cleanCol(colData)
    .chain((vals: number[]) => {
      const n = vals.length;
      const avg = (n === 0) ? 0 : vals.reduce((s, v) => s + v)/n;
      return okResult(avg);
    });
}

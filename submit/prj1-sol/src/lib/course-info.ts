import * as G from './grade-table.js';

import { Result } from 'cs544-js-utils';

/** this column type is used to uniquely identify a student */
type IdColProps = {
  kind: 'id';
  colId: string;
  name?: string;  //defaults to colId
}

/** this column type contains strings providing info about a DataRow */
type InfoColProps = {
  kind: 'info';
  colId: string;
  name?: string;  //defaults to colId
}

/** this column type is used for raw grades */
type ScoreColProps = {
  kind: 'score';
  colId: string;
  name?: string;    //defaults to colId
  category: string;
  min?: number;     //default 0
  max?: number;     //default 100
}

/** A RowFn is applied to a row to compute a statistic for that row.
 *  It should be iterated over all rows in the raw table to compute a Stat.
 *  Missing information '' should be regarded as equivalent to 0.
 *  Error values in row will be propagated.
 */
export type RowFn = (course: CourseInfo, row: G.GradeRow) => Result<G.RawData>;

/** this column is used for a stat calculated over a row  */
type CalcColProps = {
  kind: 'calc',
  colId: string;
  name?: string;  //defaults to colId
  fn: RowFn,
};

// example of a discriminated union (with kind as discriminant).
/** column which may contain undefined values for optional properties */
export type ColPropsData =
  IdColProps | InfoColProps | ScoreColProps | CalcColProps;


/** A ColFn is applied to a column to compute a statistic for that col.
 *  It should be iterated over all numeric columns in table including calc
 *  columns.  Missing information '' will be ignored and any Error values
 *  in col will be propagated.
 */
export type ColFn = (course: CourseInfo, col: G.Grade[]) => Result<G.RawData>;

/** row which computes a stat over a column */
type CalcRowPropsData = {
  kind: 'calc';
  rowId: string;
  name?: string;  //defaults to rowId
  fn: ColFn;
};

type BaseCourseInfo = {
  id: string;          /** identifies course offering */
  name: string;
  //could have other information like semester, sections, etc.
};

/** all meta-info for a course; set up for easy input */
export type CourseData = BaseCourseInfo & {
  cols: ColPropsData[];   //should have exactly one IdCol
  calcRows: CalcRowPropsData[];  
};

/** ColProps is just like ColPropsData except that name, min and
 *  max are no longer undefined and each column is enhanced with its
 *  colIndex index.
 */
export type ColProps =
  ( IdColProps
    | InfoColProps 
    | (ScoreColProps & { min: string, max: string })
    | CalcColProps
  )
  & { name: string, colIndex: number };

export type CalcRowProps = CalcRowPropsData & { name: string };


/** all meta-info for a course; set up for easy access to cols and calc-rows
 *  by id 
 */
export type CourseInfo = BaseCourseInfo & {
  rowIdColId: string;  //colId identifying a row
  cols: { [colId: string]: ColProps };
  calcRows: { [rowId: string]: CalcRowProps };
};

/** It is assumed that course has a single IdCol */
export function courseDataToCourseInfo(course: CourseData) : CourseInfo {
  const cols: { [colId: string]: ColProps } = {};
  const calcRows: { [rowId: string]: CalcRowProps } = {};
  let rowIdColId;
  for (const [colIndex, col ] of course.cols.entries()) {
    const colId = col.colId;
    const name = col.name ?? colId;
    if (col.kind === 'score') {
      const [ min, max ] = [ col.min ?? 0, col.max ?? 100 ];
      cols[colId] = { ...col, name, colIndex, min, max } as ColProps;
    }
    else {
      if (col.kind === 'id') rowIdColId = colId;
      cols[colId] = { ...col, name, colIndex } as ColProps;
    }
  }
  for (const row of course.calcRows) {
    const calcRowProp =
      (row.name === undefined) ? { ...row, name: row.rowId } : row;
    calcRows[row.rowId] = calcRowProp as CalcRowProps;
  }
  return {...course, cols, calcRows, rowIdColId};
}

/** A course object provides a readonly course property */
export interface CourseObj {
  readonly course: CourseInfo;
}

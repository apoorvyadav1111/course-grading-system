import { ErrResult, Result, okResult } from 'cs544-js-utils';


import * as C from '../lib/course-info.js';
import * as F from '../lib/formula-fns.js';
import * as G from '../lib/grade-table.js';

const cs220: C.CourseData = {
  id: 'cs220',
  name: 'Computer Architecture from a Programming Perspective',
  cols: [
    { kind: 'id', colId: 'emailId', name: 'Email ID', },
    { kind: 'info', colId: 'firstName', name: 'First Name', },
    { kind: 'info', colId: 'lastName',name: 'Last Name', },
    { kind: 'score', colId: 'prj1', category: 'project', },
    { kind: 'score', colId: 'prj2', category: 'project', },
    { kind: 'score', colId: 'prj3', category: 'project', },
    { kind: 'score', colId: 'prj4', category: 'project', },
    { kind: 'score', colId: 'prj5', category: 'project', },
    { kind: 'score', colId: 'hw1', category: 'homework', },
    { kind: 'score', colId: 'hw2', category: 'homework', },
    { kind: 'score', colId: 'hw3', category: 'homework', },
    { kind: 'score', colId: 'hw4', category: 'homework', },
    { kind: 'score', colId: 'qz1', category: 'quiz', min: 1, max: 11 },
    { kind: 'score', colId: 'qz2', category: 'quiz', min: 1, max: 11 },
    { kind: 'score', colId: 'qz3', category: 'quiz', min: 1, max: 11 },
    { kind: 'score', colId: 'qz4', category: 'quiz', min: 1, max: 11 },
    { kind: 'score', colId: 'lab', category: 'lab', min: 0, max: 10 },
    { kind: 'score', colId: 'exam1', category: 'exam', },
    { kind: 'score', colId: 'exam2', category: 'exam', },
    { kind: 'score', colId: 'exam3', category: 'exam', },
    { kind: 'calc', colId: 'prjAvg', fn: F.categoryDropAvg('project'), },
    { kind: 'calc', colId: 'hwAvg', fn: F.categoryDropAvg('homework'), },
    { kind: 'calc', colId: 'qzAvg', fn: F.categoryDropAvg('quiz'), },
    { kind: 'calc', colId: 'examAvg', fn: F.categoryDropAvg('exam'), },
    { kind: 'calc', colId: 'total', fn: totalFn, },
  ],
  calcRows: [
    { kind: 'calc', rowId: 'count', fn: F.colCount, },
    { kind: 'calc', rowId: 'max', fn: F.colMax, },
    { kind: 'calc', rowId: 'min', fn: F.colMin, },
    { kind: 'calc', rowId: 'avg', fn: F.colAvg, }
  ],
};

function totalFn(_course: C.CourseInfo, row: G.GradeRow) : Result<G.RawData> {
  const fields = ['lab', 'qzAvg', 'examAvg', 'prjAvg', 'hwAvg'];
  const fieldsPairs = fields.map(f => [f, row[f] || 0]);
  const vals = Object.fromEntries(fieldsPairs);
  const err = Object.values(vals).find(v => v instanceof ErrResult);
  if (err) return err as ErrResult;
  const v = vals as { [colId: string]: number };
  const total = (v.lab) + 1*v.qzAvg + 0.29*v.examAvg
    + 0.25*v.prjAvg + 0.25*v.hwAvg;
  return okResult(total);
}

export default C.courseDataToCourseInfo(cs220);

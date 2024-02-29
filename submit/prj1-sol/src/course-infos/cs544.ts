import * as C from '../lib/course-info.js';
import * as F from '../lib/formula-fns.js';

const WEIGHTS = {
  qzAvg: 1,
  prjAvg: 0.35,
  hwAvg: { cs544: 0.22, cs444: 0.25 },
  paper: { cs544: 1, cs444: 0 },
  midterm: 0.14,
  final: 0.15,
  extra: 1,
};
    
const cs544: C.CourseData = {
  id: 'cs544',
  name: 'Programming for the Web',
  cols: [
    { kind: 'info', colId: 'bNumber', name: 'B Number', },
    { kind: 'info', colId: 'firstName', name: 'First Name', },
    { kind: 'info', colId: 'lastName',name: 'Last Name', },
    { kind: 'id', colId: 'emailId', name: 'Email', },
    { kind: 'info', colId: 'section', name: 'Section', },
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
    { kind: 'score', colId: 'paper', category: 'paper', min: 1, max: 3 },
    { kind: 'score', colId: 'midterm', category: 'exam', },
    { kind: 'score', colId: 'final', category: 'exam', },
    { kind: 'score', colId: 'extra', category: 'extra', min: 0.5, max: 3 },
    { kind: 'calc', colId: 'prjAvg', fn: F.categoryDropAvg('project'), },
    { kind: 'calc', colId: 'hwAvg', fn: F.categoryDropAvg('homework'), },
    { kind: 'calc', colId: 'qzAvg', fn: F.categoryDropAvg('quiz'), },
    { kind: 'calc', colId: 'total', fn: F.weightedSum(WEIGHTS, 'section'), },
  ],
  calcRows: [
    { kind: 'calc', rowId: 'Count', fn: F.colCount, },
    { kind: 'calc', rowId: 'Max', fn: F.colMax, },
    { kind: 'calc', rowId: 'Min', fn: F.colMin, },
    { kind: 'calc', rowId: 'Avg', fn: F.colAvg, }
  ],
};


export default C.courseDataToCourseInfo(cs544);

import { assert, expect } from 'chai';
import util from 'util';

import * as G from '../lib/grade-table.js';
import * as U from '../lib/utils.js';

import * as DATA_220 from './data/220-data.js';
import * as DATA_544 from './data/544-data.js';

import cs220 from '../course-infos/cs220.js';
import cs544 from '../course-infos/cs544.js';
import makeGrades from '../lib/grades.js';


const ID = cs544.rowIdColId;
describe('grades', () => {

  describe('upsert row', () => {

    let grades: G.Grades;
    beforeEach(() => {
      grades = makeGrades(cs544);
    });

    it('must return an empty raw table just after initialization', () => {
      const rows = grades.getRawTable();
      expect(rows).to.have.length(0);
    });

    it('must add a single good row', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true, 'upsert ROW_544 failed');
      const rows = result544.val.getRawTable();
      expect(rows).to.have.length(1);
      const row544 = rows[0];
      expect(row544).to.deep.equal(ROW_544);
    });

    it('must add multiple good rows', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true, 'upsert ROW_544 failed');
      const result444 = result544.val.upsertRow(ROW_444);
      assert(result444.isOk === true, 'upsert ROW_444 failed');
      const rows = result444.val.getRawTable();
      expect(rows).to.have.length(2);
      const row544 = rows.find((r: G.RawRow) => r[ID] === ROW_544[ID]);
      expect(row544).to.deep.equal(ROW_544);
      const row444 = rows.find((r: G.RawRow) => r[ID] === ROW_444[ID]);
      expect(row444).to.deep.equal(ROW_444);
    });

    it('must replace an existing row', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true, 'upsert ROW_544 failed');
      const result444 = result544.val.upsertRow(ROW_444);
      assert(result444.isOk === true, 'upsert ROW_444 failed');
      const newRow = { ... ROW_544, hw1: 55, hw2: 56, hw3: 58, prj3: 62 };
      const resultNewRow = result444.val.upsertRow(newRow);
      assert(resultNewRow.isOk === true, 'upsert new row failed');
      const rows = resultNewRow.val.getRawTable();
      expect(rows).to.have.length(2);
      const row544 = rows.find((r: G.RawRow) => r[ID] === ROW_544[ID]);
      expect(row544).to.deep.equal(newRow);
      const row444 = rows.find((r: G.RawRow) => r[ID] === ROW_444[ID]);
      expect(row444).to.deep.equal(ROW_444);
    });

    it('raw table row columns must be in order given by course-info', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true, 'upsert ROW_544 failed');
      const rows = result544.val.getRawTable();
      expect(rows).to.have.length(1);
      const colIds = Object.keys(rows[0]);
      const colIndexes = colIds.map(colId => cs544.cols[colId].colIndex);
      const isOrdered =	colIndexes.every((index, i, indexes) =>
	i === 0 || indexes[i - 1] < index);
      expect(isOrdered).to.be.true;
    });
 

    it('must not make any destructive changes', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true, 'upsert ROW_544 failed');
      const rows1 = clone(U.sortGrades(result544.val.getRawTable(), ID));
      const result444 = result544.val.upsertRow(ROW_444);
      assert(result444.isOk === true, 'upsert ROW_444 failed');
      const rows2 = clone(U.sortGrades(result444.val.getRawTable(), ID));
      const newRow = { ... ROW_544, hw1: 55, hw2: 56, hw3: 58, prj3: 62 };
      const resultNewRow = result444.val.upsertRow(newRow);
      assert(resultNewRow.isOk === true, 'upsert new row failed');
      expect(U.sortGrades(result544.val.getRawTable(), ID))
	.to.deep.equal(rows1);
      expect(U.sortGrades(result444.val.getRawTable(), ID))
	.to.deep.equal(rows2);
    });

    it('must detect adding a row with a missing id', () => {
      const row444 = { ...ROW_444, };
      delete row444[ID];
      const result444 = grades.upsertRow(row444);
      assert(result444.isOk === false);
      expect(result444.errors).to.have.length(1);
      expect(result444.errors[0].options.code).to.equal('BAD_ARG');
    });
    
    it('must detect adding a row with a null entry', () => {
      const row444 = { ...ROW_444, };
      row444.prj1 = null;
      const result444 = grades.upsertRow(row444);
      assert(result444.isOk === false);
      expect(result444.errors).to.have.length(1);
      expect(result444.errors[0].options.code).to.equal('BAD_ARG');
    });
    
    it("must not add row having col of kind='calc'", () => {
      const result544 = grades.upsertRow({...ROW_544, prjAvg: 99});
      assert(result544.isOk === false, 'isOk === true');
      expect(result544.errors).to.have.length(1);
      expect(result544.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must not add row having col with val out of range', () => {
      const result544 = grades.upsertRow({...ROW_544, qz3: 12});
      assert(result544.isOk === false, 'isOk === true');
      expect(result544.errors).to.have.length(1);
      expect(result544.errors[0].options.code).to.equal('RANGE');
    });

    it('must not add row with bad col name', () => {
      const result544 = grades.upsertRow({...ROW_544, prj99: 99});
      assert(result544.isOk === false, 'isOk === true');
      expect(result544.errors).to.have.length(1);
      expect(result544.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must not add row with an extra column', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true);
      const row444 = { ...ROW_444, prj4: 99 };
      const result444 = result544.val.upsertRow(row444);
      assert(result444.isOk === false);
      expect(result444.errors).to.have.length(1);
      expect(result444.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must not add row with a missing column', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true);
      const row444 = { ...ROW_444, };
      delete row444.prj3;
      const result444 = result544.val.upsertRow(row444);
      assert(result444.isOk === false);
      expect(result444.errors).to.have.length(1);
      expect(result444.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must detect multiple errors', () => {
      const result544 = grades.upsertRow(ROW_544);
      assert(result544.isOk === true);
      //extra col, null col
      const row444: G.RawRow =
	{ ...ROW_444, prj2: null as G.RawData, prj4: 99, };
      delete row444.prj3; //missing col
      const result444 = result544.val.upsertRow(row444);
      assert(result444.isOk === false);
      expect(result444.errors).to.have.length(3);
      expect(result444.errors[0].options.code).to.equal('BAD_ARG');
    });

  });

  describe('add column', () => {

    let grades : G.Grades;

    beforeEach(() => {
      const grades0 = makeGrades(cs544);
      const result544 = grades0.upsertRow(ROW_544);
      assert(result544.isOk === true);
      const result444 = result544.val.upsertRow(ROW_444);
      assert(result444.isOk === true);
      grades = result444.val;
    });

    it('must successfully add a new empty column', () => {
      const addResult = grades.addColumn('prj4');
      assert(addResult.isOk === true);
      const rows = addResult.val.getRawTable();
      const n0 = Object.keys(ROW_544).length;
      expect(rows.every(r => Object.keys(r).length === n0 + 1)).to.be.true;
    });


    it('raw table row columns must be in order given by course-info', () => {
      const addResult = grades.addColumn('prj4');
      assert(addResult.isOk === true);
      const rows = addResult.val.getRawTable();
      expect(rows).to.have.length(2);
      for (const row of rows) {
	const colIds = Object.keys(row);
	const colIndexes = colIds.map(colId => cs544.cols[colId].colIndex);
	const isOrdered =	colIndexes.every((index, i, indexes) =>
	  i === 0 || indexes[i - 1] < index);
	expect(isOrdered).to.be.true;
      }
    });
 
    it('must not modify previous table', () => {
      const table = clone(U.sortGrades(grades.getRawTable(), ID));
      const addResult = grades.addColumn('prj4');
      assert(addResult.isOk === true);
      expect(U.sortGrades(grades.getRawTable(), ID)).to.deep.equal(table);
    });
    
    it('must not add an exiting column', () => {
      const addResult = grades.addColumn('prj3');
      assert(addResult.isOk === false);
      expect(addResult.errors).to.have.length(1);
      expect(addResult.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must not add an unknown column', () => {
      const addResult = grades.addColumn('prj99');
      assert(addResult.isOk === false);
      expect(addResult.errors).to.have.length(1);
      expect(addResult.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must not add a stats column', () => {
      const addResult = grades.addColumn('prjAvg');
      assert(addResult.isOk === false);
      expect(addResult.errors).to.have.length(1);
      expect(addResult.errors[0].options.code).to.equal('BAD_ARG');
    });

  });

  describe('patch', () => {

    let data : G.RawRow[];
    let grades : G.Grades;

    function doPatch(rows: G.RawRow[], patches: G.Patches) {
      return rows.map(row =>
	(patches[row[ID]]) ? { ...row, ...patches[row[ID]] } : row);
    }

    beforeEach(() => {
      //even indexes: 444, odd indexes: 544
      data = [ ROW_444, ROW_544, ROW_444, ROW_544, ROW_444, ROW_544, ]
        .map((row, i) => ({ ...row, ...{[ID]: `id${i}`} }));
      grades = loadData(data);
    });

    it('must patch correctly', () => {
      const patches = {
	id0: { prj2: 54, hw2: 78 },
	id2: { qz2: 8 },
	id3: { hw1: 22, midterm:55 },
      };
      const result = grades.patch(patches);
      assert(result.isOk === true);
      const patchedRows = U.sortGrades(doPatch(data, patches), ID);
      expect(U.sortGrades(result.val.getRawTable(), ID))
	.to.deep.equal(patchedRows);
    });

    it('must detect a bad rowId in patches', () => {
      const patches = {
	id0: { prj2: 54, hw2: 78 },
	id2: { qz2: 8 },
	id99: { hw1: 22, midterm:55 },
      };
      const result = grades.patch(patches);
      assert(result.isOk === false); 
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must detect a bad colId in patches', () => {
      const patches = {
	id0: { prj2: 54, hw2: 78 },
	id2: { qz2: 8 },
	id3: { hw4: 22, midterm:55 },
      };
      const result = grades.patch(patches);
      assert(result.isOk === false); 
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must detect out-of-range data in patches', () => {
      const patches = {
	id0: { prj2: 54, hw2: 78 },
	id2: { qz2: 12 },
	id3: { hw3: 22, midterm:55 },
      };
      const result = grades.patch(patches);
      assert(result.isOk === false); 
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('RANGE');
    });

  });

  describe('full table', () => {

    let grades : G.Grades;
    let full: G.GradeRow[];
    let raw: G.RawRow[];

    describe ('220 full table', () => {

      beforeEach(() => {
	const rawCsvStr = DATA_220.RAW;
	raw = U.csvToObj(rawCsvStr) as G.RawRow[];
	grades = loadData(raw, cs220);
	const fullCsvStr = DATA_220.FULL;
	full = U.csvToObj(fullCsvStr) as G.RawRow[];
      });

      it('must compare full table', () => {
	//console.log(util.inspect(grades.getRawTable()));
	//console.log(util.inspect(U.sortGrades(grades.getFullTable(), ID)));
	//console.log(util.inspect(U.sortGrades(full, ID)));
	expect(U.sortGrades(grades.getRawTable(), ID))
	  .to.deep.equal(U.sortGrades(raw, ID));
	expect(U.sortGrades(toFixed(grades.getFullTable()), ID))
	  .to.deep.equal(U.sortGrades(full, ID));
      });

    });

    describe('cs544 full table', () => {

      beforeEach(() => {
	const rawCsvStr = DATA_544.RAW;
	raw = U.csvToObj(rawCsvStr) as G.RawRow[];
	grades = loadData(raw);
	const fullCsvStr = DATA_544.FULL;
	full = U.csvToObj(fullCsvStr) as G.RawRow[];
      });

      it('must compare full table', () => {
	//console.log(util.inspect(grades.getRawTable()));
	//console.log(util.inspect(U.sortGrades(grades.getFullTable(), ID)));
	//console.log(util.inspect(U.sortGrades(full, ID)));
	expect(U.sortGrades(grades.getRawTable(), ID))
	  .to.deep.equal(U.sortGrades(raw, ID));
	expect(U.sortGrades(toFixed(grades.getFullTable()), ID))
	  .to.deep.equal(U.sortGrades(full, ID));
      });

      it('accessing full table should not mutate Grades', () => {
	const raw = clone(grades.getRawTable()) as G.RawRow[];
	const full = grades.getFullTable();
	expect(raw.length <= full.length); //trivial use of full
	expect(U.sortGrades(grades.getRawTable(), ID))
	  .to.deep.equal(U.sortGrades(raw, ID));
      });

    });
    
  });



});

function toFixed(data: G.GradeRow[], nDigits=1) : G.GradeRow[] {
  const fix = (n: number) => Number(n.toFixed(nDigits));
  const rows: G.GradeRow[] = [];
  data.forEach((row: G.RawRow) => {
    const rowPairs = Object.entries(row).map(([k, v]) =>
      [k, (typeof v === 'number' && String(v).match(/\./)) ? fix(v) : v ]);
    rows.push(Object.fromEntries(rowPairs));
  });
  return rows;
}

  
function loadData(data: G.RawRow[], course=cs544) {
  let grades : G.Grades = makeGrades(course);
  data.forEach((row: G.RawRow) => {
    const result = grades.upsertRow(row);
    assert(result.isOk === true);
    grades = result.val;
  });
  return grades;
}

function clone(o: Object) : Object {
  return JSON.parse(JSON.stringify(o));
}

const ROW_544 : G.RawRow = {
  'bNumber': 'B0082315', 'firstName': 'John', 'lastName': 'Smith',
  'emailId': 'jsmith99', 'section': 'cs544',
  prj2: 100, prj3: 92, prj1: 99, 
  hw3: 88, hw1: 82, hw2: 92,
  qz1: 9, qz3: 7, qz2: 11, 
  midterm: 77, final: 88, paper: 2, extra: '',
};

const ROW_444 : G.RawRow = {
  'bNumber': 'B0023478', 'firstName': 'Sue', 'lastName': 'Jones',
  'emailId': 'sjones02', 'section': 'cs444',
  prj1: 100, prj2: 100, prj3: 99,
  hw1: 88, hw2: 94, hw3: 99,
  qz1: 9, qz2: 11, qz3: 9,
  midterm: 88, final: 92, paper: '', extra: 2,
};



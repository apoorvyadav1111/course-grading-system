//will run the project DAO using an in-memory mongodb server
import MemGradesDao from './grades-mem-dao.js';

import * as D from '../lib/grades-dao.js';
import { GradeTable as G, COURSES, sortGrades } from 'cs544-prj1-sol';

import { ErrResult, Result } from 'cs544-js-utils';
import { readJson } from 'cs544-node-utils';


import { assert, expect } from 'chai';



const DATA_DIR = `${process.env.HOME}/cs544/data`;
const COURSES_DATA = {
  cs220: {
    raw: `${DATA_DIR}/220-raw.json`,
    full: `${DATA_DIR}/220-full.json`,
  },
};

const DATA : { [key: string]: {[rawFull: string]: G.RawTable } } = {};

before(async () => {
  for (const courseId of Object.keys(COURSES)) {
    for (const rawFull of ['raw', 'full']) {
      const path = `${DATA_DIR}/${courseId}-${rawFull}.json`;
      const jsonResult = await readJson(path);
      assert(jsonResult.isOk);
      DATA[courseId] ??= {};
      DATA[courseId][rawFull] = jsonResult.val as G.RawTable;
    }
  }
});

describe('grades dao', () => {

  //mocha will run beforeEach() before each test to set up these variables
  let dao: D.GradesDao;
  beforeEach(async function () {
    dao = await MemGradesDao.setup();
  });

  //mocha runs this after each test; we use this to clean up the DAO.
  afterEach(async function() {
    await MemGradesDao.tearDown(dao);
  });


  it('loading raw-data must return that data', async () => {
    for (const courseId of Object.keys(DATA)) {
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const actual = sortGrades(loadResult.val.getRawTable(), rowIdColId);
      const expected = sortGrades(data, rowIdColId);
      expect(actual).to.be.deep.equal(expected);
    }
  });

  it('loaded data must persist', async () => {
    for (const courseId of Object.keys(DATA)) {
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const gradesResult = await dao.getGrades(courseId);
      assert(gradesResult.isOk);
      const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
      const expected = sortGrades(data, rowIdColId);
      expect(actual).to.be.deep.equal(expected);
    }
  });

  it('persisted data must get cleared', async () => {
    for (const courseId of Object.keys(DATA)) {
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
    }
    const clearResult = await dao.clear();
    assert(clearResult.isOk);
    for (const courseId of Object.keys(DATA)) {
      const rowIdColId = COURSES[courseId].rowIdColId;
      const gradesResult = await dao.getGrades(courseId);
      assert(gradesResult.isOk);
      const actual = gradesResult.val.getRawTable();
      expect(actual).to.have.length(0);
    }
  });

  describe ('upsert rows', () => {
    
    it('must add a new row', async () => {
      const courseId = 'cs220';
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      expect(data).to.have.length.above(0);
      const newRow = { ...data[0], [rowIdColId]: 'xxx' };
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const upsertResult = await dao.upsertRow(courseId, newRow);
      assert(upsertResult.isOk);
      const gradesResult = await dao.getGrades(courseId);
      assert(gradesResult.isOk);
      const expected = sortGrades([...data, newRow ], rowIdColId);
      const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
      expect(actual).to.be.deep.equal(expected);
    });

    
    it('must replace an existing row', async () => {
      const courseId = 'cs220';
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      expect(data).to.have.length.above(0);
      const newRow = { ...data[0], firstName: 'xxx' };
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const upsertResult = await dao.upsertRow(courseId, newRow);
      assert(upsertResult.isOk);
      const gradesResult = await dao.getGrades(courseId);
      assert(gradesResult.isOk);
      const expected = sortGrades([...data.slice(1), newRow ], rowIdColId);
      const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
      expect(actual).to.be.deep.equal(expected);
    });

    it('must upsert rows into totally empty table', async () => {
      const courseId = 'cs220';
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = [ { emailId: 'xxx', prj1: 88 }, { emailId: 'aaa', prj1: 80 } ];
      expect(data).to.have.length.above(0);
      const upsertResult = await dao.upsertRows(courseId, data);
      assert(upsertResult.isOk);
      const gradesResult = await dao.getGrades(courseId);
      assert(gradesResult.isOk);
      const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
      const expected = sortGrades(data, rowIdColId);
      expect(actual).to.be.deep.equal(expected);
    });
  });
  
  
  it('must add columns', async () => {
    const courseId = 'cs220';
    const rowIdColId = COURSES[courseId].rowIdColId;
    const addCols = [ 'prj4', 'hw4' ];
    const data = DATA[courseId].raw;
    const loadResult = await dao.load(courseId, data);
    assert(loadResult.isOk);
    const colsResult = await dao.addColumns(courseId, ...addCols);
    assert(colsResult.isOk);
    const gradesResult = await dao.getGrades(courseId);
    assert(gradesResult.isOk);
    const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
    const addColsData = Object.fromEntries(addCols.map((c: string) => [c, '']));
    const expected =
      sortGrades(data.map(row => ({...row, ...addColsData})), rowIdColId);
    expect(actual).to.be.deep.equal(expected);
  });

  
  it('must patch newly added column', async () => {
    const courseId = 'cs220';
    const addColId = 'prj4';
    const rowIdColId = COURSES[courseId].rowIdColId;
    const data = DATA[courseId].raw;
    const addData = data.map((_: any) => ({ [addColId]: randGrade() }));
    const loadResult = await dao.load(courseId, data);
    assert(loadResult.isOk);
    const colsResult = await dao.addColumns(courseId, addColId);
    assert(colsResult.isOk);
    const patches =
      Object.fromEntries(data.map((row, i) => [ row[rowIdColId], addData[i] ]));
    const patchResult = await dao.patch(courseId, patches);
    assert(patchResult.isOk);
    const gradesResult = await dao.getGrades(courseId);
    assert(gradesResult.isOk);
    const actual = sortGrades(gradesResult.val.getRawTable(), rowIdColId);
    const expected =
      sortGrades(data.map((row, i) => ({...row, ...addData[i]})), rowIdColId);
    expect(actual).to.be.deep.equal(expected);
  });

  describe('errors', () => {

    it('adding row with valid column not in table must error', async () => {
      const courseId = 'cs220';
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      expect(data).to.have.length.above(0);
      const newRow = { ...data[0], prj4: 77 };
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const upsertResult = await dao.upsertRow(courseId, newRow);
      assert(upsertResult.isOk === false);
      expect(upsertResult.errors).to.have.length(1);
      expect(upsertResult.errors[0].options.code).to.equal('BAD_ARG');
    });

    
    it('using a bad course-id for getGrades() errors BAD_ARG', async () => {
      for (const courseId of Object.keys(DATA)) {
        const data = DATA[courseId].raw;
        const loadResult = await dao.load(courseId, data);
        assert(loadResult.isOk);
        const gradesResult = await dao.getGrades('cs707');
        assert(gradesResult.isOk===false);
        expect(gradesResult.errors).to.have.length(1);
        expect(gradesResult.errors[0].options.code).to.equal('BAD_ARG');
      }
    });
    
    it('adding a totally unknown column must result in an error', async () => {
      const courseId = 'cs220';
      const addCol =  'xxx' ;
      const data = DATA[courseId].raw;
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const colsResult = await dao.addColumn(courseId, addCol);
      assert(colsResult.isOk===false);
      expect(colsResult.errors).to.have.length(1);
      expect(colsResult.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('patching in an out-of-range grade must error', async () => {
      const courseId = 'cs220';
      const patchColId = 'prj3';
      const rowIdColId = COURSES[courseId].rowIdColId;
      const data = DATA[courseId].raw;
      const loadResult = await dao.load(courseId, data);
      assert(loadResult.isOk);
      const patches = { [data[0][rowIdColId]]: {[patchColId]:105} };
      const patchResult = await dao.patch(courseId, patches);
      assert(patchResult.isOk===false);
      expect(patchResult.errors).to.have.length(1);
      expect(patchResult.errors[0].options.code).to.equal('RANGE');
    });
    
  });
  

});

function randGrade() {
  return Number((Math.random()*100).toFixed(0));
}

import { assert, expect } from 'chai';

import { errResult } from 'cs544-js-utils';
import * as G from '../lib/grade-table.js';

import cs544 from '../course-infos/cs544.js';

import { weightedSum, categoryDropAvg, colMax, colMin, colCount, colAvg }
  from '../lib/formula-fns.js';

describe('formula functions', () => {

  describe('average after drop', () => {

    it('must compute projects average after drop', () => {
      const prjAvgFn = categoryDropAvg('project');
      const result = prjAvgFn(cs544, CS544_XROW);
      assert(result.isOk === true);
      expect(result.val).to.equal(CS544_STATS.prjAvg);
    });
    
    it('must compute homework average after drop', () => {
      const prjAvgFn = categoryDropAvg('homework');
      const result = prjAvgFn(cs544, CS544_XROW);
      assert(result.isOk === true);
      expect(result.val).to.equal(CS544_STATS.hwAvg);
    });
    
    it('must compute quiz average after drop', () => {
      const prjAvgFn = categoryDropAvg('quiz');
      const result = prjAvgFn(cs544, CS544_XROW);
      assert(result.isOk === true);
      expect(result.val).to.equal(CS544_STATS.qzAvg);
    });

    it('must detect error for an invalid category', () => {
      const prjAvgFn = categoryDropAvg('project1');
      const result = prjAvgFn(cs544, CS544_XROW);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

  });

  describe('weighted sum', () => {

    it('must correctly compute weighted sum for one section', () => {
      const wtFn = weightedSum(W, 'section');
      const result = wtFn(cs544, CS544_XROW);
      assert(result.isOk === true);
      expect(result.val).to.equal(CS544_STATS.total);
    });

    it('must correctly compute weighted sum for another section', () => {
      const wtFn = weightedSum(W, 'section');
      const result = wtFn(cs544, CS444_XROW);
      assert(result.isOk === true);
      expect(result.val).to.equal(CS444_STATS.total);
    });

    it('must detect error for an invalid colId in weights', () => {
      const w = { ...W, exAvg: 0.1 };
      const wtFn = weightedSum(w, 'section');
      const result = wtFn(cs544, CS444_XROW);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must propagate previous error', () => {
      const w = { ...W, exAvg: 0.1 };
      const wtFn = weightedSum(w, 'section');
      const stats =
	{ ...CS444_STATS, prjAvg: errResult('propagate', 'BAD_ARG') };
      const result = wtFn(cs544, {...CS444_DATA, ...stats} as G.GradeRow);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

  });

  describe('column functions', () => {
    const OK_COL: G.Grade[] = [50, '-', 30, 20, 40, 10];
    const [MAX, MIN, AVG, COUNT] = [50, 10, 30, 5];
    const ERR_COL: G.Grade[] =
      [50, errResult('propagate', 'BAD_ARG'), 30, 20, 40, 10];

    it('must compute max of error-free column', () => {
      const result = colMax(cs544, OK_COL);
      assert(result.isOk === true);
      expect(result.val).to.equal(MAX);
    });
    
    it('must propagate error when computing max of error column', () => {
      const result = colMax(cs544, ERR_COL);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });
    
    it('must compute min of error-free column', () => {
      const result = colMin(cs544, OK_COL);
      assert(result.isOk === true);
      expect(result.val).to.equal(MIN);
    });
    
    it('must propagate error when computing min of error column', () => {
      const result = colMin(cs544, ERR_COL);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });

    it('must compute count of error-free column', () => {
      const result = colCount(cs544, OK_COL);
      assert(result.isOk === true);
      expect(result.val).to.equal(COUNT);
    });
    
    it('must propagate error when computing count of error column', () => {
      const result = colCount(cs544, ERR_COL);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });
    
    it('must compute average of error-free column', () => {
      const result = colAvg(cs544, OK_COL);
      assert(result.isOk === true);
      expect(result.val).to.equal(AVG);
    });
    
    it('must propagate error when computing average of error column', () => {
      const result = colAvg(cs544, ERR_COL);
      assert(result.isOk === false);
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].options.code).to.equal('BAD_ARG');
    });
    
    
  });

});


const W = {
  qzAvg: 1,
  prjAvg: 0.35,
  hwAvg: { cs544: 0.22, cs444: 0.25 },
  paper: { cs544: 1, cs444: 0 },
  midterm: 0.14,
  final: 0.15,
  extra: 1,
};

const CS544_DATA = {
  'bNumber': 'x', 'firstName': 'John', 'lastName': 'Smith',
  'email': 'x@binghamton.edu', 'section': 'cs544',
  prj1: 99, prj2: '', prj3: 92, prj4: 78,
  hw1: 82, hw2: '', hw3: 88, hw4: '',
  qz1: 9, qz2: 11, qz3: 5, qz4: 7,
  midterm: 77, final: 88, paper: 2, extra: '',
};

const D5 = CS544_DATA;

const prjAvg_5 = (D5.prj1 + D5.prj3 + D5.prj4)/3;
const hwAvg_5 =  (D5.hw1 + D5.hw3)/3;
const qzAvg_5 =  (D5.qz1 + D5.qz2 + D5.qz4)/3;

const CS544_STATS = { 
  prjAvg: prjAvg_5, 
  hwAvg: hwAvg_5,
  qzAvg: qzAvg_5,
  total: qzAvg_5*W.qzAvg + prjAvg_5*W.prjAvg + hwAvg_5*W.hwAvg.cs544
    + W.paper.cs544*((D5.paper || 0) as number)
    + W.midterm*D5.midterm + W.final*D5.final
    + W.extra*((D5.extra || 0) as number)
};

const CS544_XROW: G.GradeRow = { ...CS544_DATA, ...CS544_STATS };

const CS444_DATA = {
  'bNumber': 'x', 'firstName': 'Sue', 'lastName': 'Jones',
  'email': 'x@binghamton.edu', 'section': 'cs444',
  prj1: 87, prj2: 92, prj3: '', prj4: 72,
  hw1: '', hw2: 94, hw3: 99,
  qz1: '', qz2: 11, qz3: '', qz4: '',
  midterm: 88, final: 92, paper: '', extra: 2,
};


const D4 = CS444_DATA;

const prjAvg_4 = (D4.prj1 + D4.prj2 + D4.prj4)/3;
const hwAvg_4 =  (D4.hw2 + D4.hw3)/3;
const qzAvg_4 =  (D4.qz2)/3;

const CS444_STATS = { 
  prjAvg: prjAvg_4, 
  hwAvg: hwAvg_4,
  qzAvg: qzAvg_4,
  total: qzAvg_4*W.qzAvg + prjAvg_4*W.prjAvg + hwAvg_4*W.hwAvg.cs444
    + W.paper.cs444*((D4.paper || 0) as number)
    + W.midterm*D4.midterm + W.final*D4.final
    + W.extra*((D4.extra || 0) as number)
};

const CS444_XROW = { ...CS444_DATA, ...CS444_STATS } as G.GradeRow;

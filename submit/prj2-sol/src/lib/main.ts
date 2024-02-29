import * as D from './grades-dao.js';
import { GradeTable as G} from 'cs544-prj1-sol';

import { okResult, errResult, Result } from 'cs544-js-utils';
import { readJson, scriptName, cwdPath } from 'cs544-node-utils';

import fs from 'fs';
import Path from 'path';
import { Interface as RLInterface, createInterface } from 'readline';
import util from 'util';

/************************* Top level routine ***************************/

const OUT_FMTS = [ 'text', 'js', 'json', 'json2' ]; 

export default async function main(args: string[]) {
  let outFmt = 'text';
  const m = args.length > 0 && args[0].match(/^--out=(\w+)$/);
  if (m) {
    if (OUT_FMTS.indexOf(m[1]) < 1) usage();
    args.shift();
    outFmt = m[1];
  }
  if (args.length === 0) usage();
  const dbUrl = args.shift();
  let dao: D.GradesDao;
  try {
    const daoResult = await D.makeGradesDao(dbUrl);
    if (!daoResult.isOk) {
      errors(daoResult);
      process.exit(1);
    }
    else {
      dao = daoResult.val;
      await doCmd(dao, outFmt, args);
    }
  }
  catch (err) {
    let e = errResult(err);
    errors(e);
  }
  finally {
    if (dao) await dao.close();
  }
}

const CMD_USAGE = `
  command can be one of:
     rawTable COURSE_ID
       Return raw grades (no stats) for COURSE_ID.
     fullTable COURSE_ID 
       Return grades table (including stats) for COURSE_ID.
     upsertRow COURSE_ID [COL_ID VALUE]...
       Update grades for COURSE_ID with row { [COL_ID]: VALUE, ... }
     addCols COURSE_ID COL_ID...
       Add columns COL_ID... to grades for course COURSE_ID
     patch COURSE_ID [ ROW_ID COL_ID VALUE ]...
     clear
       Clear out all courses.
     help:
       Print this message.
     load COURSE_ID GRADES_JSON_PATH
       Set raw grades for COURSE_ID to data read from GRADES_JSON_PATH.
`;

function usage() : never {
  console.error(`${scriptName()} [--out=${OUT_FMTS.join('|')}] DB_URL CMD ...`);
  console.error(CMD_USAGE);		  
  process.exit(1);
}


/****************************** Commands *******************************/


type CmdFn = (dao: D.GradesDao, outFmt: string, args: string[]) => void;

const NUM_RE = /^[-+]?\d+(\.\d*)?$/;

async function rawTable(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length !== 1) {
    errors(errResult('rawTable COURSE_ID'));
  }
  const courseId = args[0];
  const gradesResult = await dao.getGrades(courseId);
  if (gradesResult.isOk) {
    outResult(okResult(gradesResult.val.getRawTable()), outFmt, true);
  }
  else {
    outResult(gradesResult, outFmt, true);
  }
}

async function fullTable(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length !== 1) {
    errors(errResult('fullTable COURSE_ID'));
  }
  const courseId = args[0];
  const gradesResult = await dao.getGrades(courseId);
  if (gradesResult.isOk) {
    outResult(okResult(gradesResult.val.getFullTable()), outFmt, true);
  }
  else {
    outResult(gradesResult, outFmt, true);
  }
}

async function help(dao: D.GradesDao, outFmt: string, args: string[]) {
  usage();
}

async function clear(dao: D.GradesDao, outFmt: string, args: string[]) {
  await dao.clear();
}

async function load(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length !== 2) {
    errors(errResult('load COURSE_ID JSON_PATH'));
  }
  const [courseId, jsonPath] = args;
  const path = jsonPath.replace(/^(\~|\$HOME)/, process.env['HOME']);
  const jsonResult = await readJson(path);
  if (!jsonResult.isOk) errors(jsonResult);
  outResult(await dao.load(courseId, jsonResult.val as G.RawTable), outFmt);
}

async function upsertRow(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length < 3 || args.length%2 !== 1) {
    errors(errResult('load COURSE_ID [COL_ID VAL]...'));
  }
  const [courseId, ...keyVals] = args;
  const pairs : ([string, string|number])[] =
    Array.from({length: keyVals.length/2})
    .map((_, i) => {
      const [colId, val] = [ keyVals[2*i], keyVals[2*i + 1] ];
      const value: string|number = NUM_RE.test(val) ? Number(val) : val;
      return [ colId, value ];
    });
  const row = Object.fromEntries(pairs) as G.RawRow;
  outResult(await dao.upsertRow(courseId, row), outFmt);
}

async function addCols(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length < 2) {
    errors(errResult('addCols COURSE_ID COL_ID...'));
  }
  const [courseId, ...colIds] = args;
  outResult(await dao.addColumns(courseId, ...colIds), outFmt);
}

async function patch(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length < 4 || args.length%3 !== 1) {
    errors(errResult('patch COURSE_ID [ROW_ID COL_ID VAL]...'));
  }
  const [courseId, ...args3] = args;
  const triples : ([string, string, string])[] =
    Array.from({length: args3.length/3})
      .map((_, i) => [ args3[3*i], args3[3*i + 1], args3[3*i + 2] ]);
  const patches: G.Patches = {};
  triples.forEach(([rowId, colId, val]) => {
    const value: G.RawData = (NUM_RE.test(val)) ? Number(val) : val;
    patches[rowId] ??= {};
    patches[rowId][colId] = value;
  });
  return outResult(await dao.patch(courseId, patches), outFmt);		  
}

const DISPATCH_TABLE : { [cmd: string]: CmdFn } = {
  rawTable, fullTable, upsertRow, addCols, patch, clear, help, load
};

async function doCmd(dao: D.GradesDao, outFmt: string, args: string[]) {
  if (args.length < 1) usage();
  const cmd = args.shift();
  const cmdFn = DISPATCH_TABLE[cmd];
  if (!cmdFn) {
    errors(errResult(`unknow command "${cmd}"`));
  }
  await cmdFn(dao, outFmt, args);
}

/**************************** Output Routines **************************/

type Table = ({ [key: string]: number|string })[];
function outResult(result: Result<any>, outFmt: string,
		   isRaw: boolean = false) {
  if (!result.isOk) errors(result);
  const table =
    isRaw
    ? result.val as Table
    : (result.val as G.Grades).getRawTable() as Table;
  outTable(table, outFmt);
}


const MAX_DEC = 1;

function roundValues(table: Table) {
  const rounded = [];
  for (const row of table) {
    const roundedRow : {[colId: string]: number|string} = {};
    for (const [colId, val] of Object.entries(row)) {
      const rounded: number|string =
	Number(val) && /\./.test(val.toString())
	? Number((val as number).toFixed(MAX_DEC))
        : val;
      roundedRow[colId] = rounded;
    }
    rounded.push(roundedRow);
  }
  return rounded;
}
function outTable(table: Table, outFmt: string) {
  const rounded = roundValues(table);
  switch (outFmt) {
    case 'text':
      outTextTable(rounded);
      break;
    case 'js':
      console.log(rounded);
      break;
    case 'json':
      console.log(JSON.stringify(rounded));
      break;
    case 'json2':
      console.log(JSON.stringify(rounded, null, 2));
      break;
  }
}

function outTextTable(table: Table) {
  const out = (...args: any[]) => console.log(...args);
  const widths = colWidths(table);
  out(Object.keys(widths).map(k => k.padStart(widths[k])).join(' '));
  for (const row of table) {
    const items = [];
    for (const [k, w] of Object.entries(widths)) {
      const val = (row[k] ?? '').toString();
      items.push(NUM_RE.test(val) ? val.padStart(w) : val.padEnd(w));
    }
    out(items.join(' '));
  }
}
  
function colWidths(table: Table) : { [colId: string]: number } {
  const widths : { [colId: string]: number } = {};
  for (const row of table) {
    for (const [k, v] of (Object.entries(row))) {
      widths[k] ??= k.length;
      const vLen = (v ?? '').toString().length;
      if (widths[k] < vLen) widths[k] = vLen;
    }
  }
  return widths;
}


/******************************* Utilities *****************************/


function errors<T>(result: Result<T>) : never {
  if (result.isOk === false) {
    for (const e of result.errors) {
      console.error(e.message);
    }
  }
  process.exit(1);
}
  

import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';
import { GradesDao, makeGradesDao } from 'cs544-prj2-sol';
import serve, { App } from './grades-ws.js';

import { Result, okResult, errResult, ErrResult } from 'cs544-js-utils';
import { cwdPath, readJson } from 'cs544-node-utils';

import assert from 'assert';
import fs from 'fs';
import util from 'util';
import https from 'https';
import Path from 'path';

const readFile = util.promisify(fs.readFile);
export default function () { return main(process.argv.slice(2)); }

async function main(args: string[]) {
  if (args.length < 1) usage();
  const config = (await import(cwdPath(args[0]))).default;
  const port: number = config.ws.port;
  if (port < 1024) {
    usageError(`bad port ${port}: must be >= 1024`);
  }
  let dao : GradesDao|null = null;
  try {
    const daoResult = await makeGradesDao(config.auth.dbUrl);
    if (!daoResult.isOk) panic(daoResult);
    dao = daoResult.val;
    const loadResult = await loadGrades(dao, args.slice(1));
    if (!loadResult.isOk) panic(loadResult);
    const app = serve(dao);
    const serverOpts = {
      key: fs.readFileSync(config.https.keyPath),
      cert: fs.readFileSync(config.https.certPath),
    };
    const server = https.createServer(serverOpts, app)
      .listen(config.ws.port, function() {
	console.log(`listening on port ${config.ws.port}`);
      });
    //terminate using SIGINT ^C
    //console.log('enter EOF ^D to terminate server');
    //await readFile(0, 'utf8');
    //server.close(); 
  }
  catch (err) {
    console.error(err);
    process.exit(1);
  }
  finally {
    //if (dao) await dao.close();
  }
}

async function loadGrades(dao: GradesDao, gradesJsonPaths: string[])
  : Promise<Result<void>>
{
  if (gradesJsonPaths.length === 0) return okResult(undefined);
  const clearResult = await dao.clear();
  if (!clearResult.isOk) return clearResult;
  for (const path of gradesJsonPaths) {
    const readResult: Result<G.RawTable> = await readJson(path);
    if (!readResult.isOk) return readResult as Result<void>
    const base = Path.basename(path, '.json');
    const courseId = base.replace(/[^\w].+$/, '');
    const loadResult = await dao.load(courseId, readResult.val);
    if (!loadResult.isOk) return loadResult as Result<void>;
  }
  return okResult(undefined);
}



/** Output usage message to stderr and exit */
function usage() : never  {
  const prog = Path.basename(process.argv[1]);
  console.error(`usage: ${prog} CONFIG_MJS [GRADES_JSON_PATH...]`);
  process.exit(1);
}

function usageError(err?: string) {
  if (err) console.error(err);
  usage();
}

function panic(result: ErrResult) : never {
  assert(!result.isOk);
  result.errors.forEach(e => console.error(e.message));
  process.exit(1);
}

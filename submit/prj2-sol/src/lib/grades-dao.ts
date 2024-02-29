import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

import * as mongo from 'mongodb';

import { okResult, errResult, Result } from 'cs544-js-utils';



export async function makeGradesDao(mongodbUrl: string)
  : Promise<Result<GradesDao>> 
{
  return GradesDao.make(mongodbUrl);
}

export class GradesDao {

  #client: mongo.MongoClient;
  #grades: mongo.Collection;

  private constructor(params: { [key: string]: any }) {
    this.#client = params.client;
    this.#grades = params.grades;
  }

  /** Factory method for constructing a GradesDao.
   */
  static async make(dbUrl: string) : Promise<Result<GradesDao>> {
    const params: { [key: string]: any } = {};
    try {
      params.client = await (new mongo.MongoClient(dbUrl)).connect();
      const db = params.client.db();
      const grades = db.collection(GRADES_COLLECTION);
      params.grades = grades;
      await grades.createIndex('courseId');
      return okResult(new GradesDao(params));
    }
    catch (error) {
      return errResult(error.message, 'DB');
    }
  }

  /** Close this DAO. */
  async close() : Promise<Result<void>> {
    try{
      await this.#client.close();
    }catch(e){
      return errResult(e.message, 'DB');
    }
  }

  /** Set grades for courseId to rawRows. 
   *  Errors:
   *   BAD_ARG: courseId is not a valid course-id.
   */
  async load(courseId: string, rawTable: G.RawTable)
    : Promise<Result<G.Grades>>
  {
    const check = checkCourseId(courseId)
    if(!check.isOk){
      return errResult(`unknown course id ${courseId}`,'BAD_ARG');
    }else{
      return this.#write(courseId,rawTable)
    }
  }
  
  /** Return a Grades object for courseId. 
   *  Errors:
   *   BAD_ARG: courseId is not a valid course-id.
   */
  async getGrades(courseId: string): Promise<Result<G.Grades>> {
    const check = checkCourseId(courseId)
    if(!check.isOk){
      return errResult(`unknown course id ${courseId}`,'BAD_ARG');
    }else{
      return this.#read(courseId)
    }
  }

  /** Remove all course grades stored by this DAO */
  async clear() : Promise<Result<void>> {
    try{
      await this.#grades.deleteMany({});
      return okResult(undefined);
    }
    catch(e){
      return errResult(e.message,'DB');
    }
  }

  /** Upsert (i.e. insert or replace) row to table and return the new
   *  table.
   *
   *  Error Codes:
   *
   *   'BAD_ARG': row specifies an unknown colId or a calc colId or
   *              contains an extra/missing colId not already in table,
   *              or is missing an id column identifying the row.
   *   'RANGE':   A kind='score' column value is out of range
   */
  async upsertRow(courseId: string, row: G.RawRow) : Promise<Result<G.Grades>> {
    return this.upsertRows(courseId, [row]);
  }

  /** Upsert zero-or-more rows.  Basically upsertRow() for
   *  multiple rows.   Will detect errors in multiple rows.
   */
  async upsertRows(courseId: string, rows: G.RawRow[])
    : Promise<Result<G.Grades>> 
  {
    const check = checkCourseId(courseId);
    if(!check.isOk){
      return errResult(`unknown course id ${courseId}`,'BAD_ARG');
    }else{
      const gradeObj = await this.#read(courseId);
      if(!gradeObj.isOk){
        return gradeObj;
      }else{
        const newGradeObj = gradeObj.val.upsertRows(rows);
        if(!newGradeObj.isOk){
          return newGradeObj;
        }else{
          return this.#write(courseId,newGradeObj.val.getRawTable())
        }
      }
    }
  }

  /** Add an empty column for colId to table.
   *  Errors:
   *    BAD_ARG: colId is already in table or is not a score/info/id colId
   *    for course.
   */
  async addColumn(courseId: string, colId: string) : Promise<Result<G.Grades>> {
    return this.addColumns(courseId, colId);
  }
  
  /** Add empty columns for colId in colIds to table.
   *  Errors:
   *    BAD_ARG: colId is already in table or is not a score/info colId
   *    for course.
   */
  async addColumns(courseId: string, ...colIds: string[])
    : Promise<Result<G.Grades>>
  {
    const check = checkCourseId(courseId);
    if(!check.isOk){
      return errResult(`unknown course id ${courseId}`,'BAD_ARG');
    }else{
      const gradeObj = await this.#read(courseId);
      if(!gradeObj.isOk){
        return gradeObj;
      }else{
        const newGradeObj = gradeObj.val.addColumns(...colIds);
        if(!newGradeObj.isOk){
          return newGradeObj;
        }else{
          return this.#write(courseId,newGradeObj.val.getRawTable())
        }
      }
    }
  }
  
  /** Apply patches to table, returning the patched table.
   *  Errors:
   *    BAD_ARG: A patch rowId or colId is not in table.
   *    RANGE: Patch data is out-of-range.
   */
  async patch(courseId: string, patches: G.Patches)
    : Promise<Result<G.Grades>> 
  { 
    const check = checkCourseId(courseId);
    if(!check.isOk){
      return errResult(`unknown course id ${courseId}`,'BAD_ARG');
    }else{
      const gradeObj = await this.#read(courseId);
      if(!gradeObj.isOk){
        return gradeObj;
      }else{
        const newGradeObj = gradeObj.val.patch(patches);
        if(!newGradeObj.isOk){
          return newGradeObj;
        }else{
          return this.#write(courseId,newGradeObj.val.getRawTable())
        }
      }
    }
  }

  //TODO: add private methods  
  async #write(courseId: string, rawTable: G.RawTable)
    :Promise<Result<G.Grades>>
  {
    try{
    const collection = this.#grades;
    const updateOp = {$set: {courseId,rawTable}};
    const updateOpts = {returnDocument: mongo.ReturnDocument.AFTER, upsert:true};
    const updateResult = await collection.findOneAndUpdate({courseId},updateOp,updateOpts);
    if(!updateResult){
      return errResult(`unexpected falsy UpdateResult`, {code: 'DB'});
    }else if(!updateResult.value){
      const msg = `unknown error`;
      return errResult(msg, { code: 'Cannot Get Updated Table' });
    }else{
      delete updateResult.value._id;
      const grade = GradesImpl.makeGradesWithData(courseId,updateResult.value.rawTable);
      return grade;
    }
    }catch(e){
      console.log(e);
      return errResult(e.message, 'DB');
    }
  }

  async #read(courseId: string)
    :Promise<Result<G.Grades>>
  {
    try{
      const collection = this.#grades;
      const dbEntry = await collection.findOne({courseId});
      if(dbEntry){
        delete dbEntry._id;
        const grade = GradesImpl.makeGradesWithData(courseId,dbEntry.rawTable);
        return grade;
      }else{
        const grade = GradesImpl.makeGradesWithData(courseId,[]);
        return grade;
      }

    }catch(e){
      console.log(e);
      return errResult(e.message, 'DB')
    }
  }
}

/** Return an error result if courseId is unknown */
function checkCourseId(courseId: string) : Result<void> {
  return (COURSES[courseId])
    ? okResult(undefined)
    : errResult(`unknown course id ${courseId}`);
}

//TODO: add more local functions, constants, etc.
const GRADES_COLLECTION = 'grades';

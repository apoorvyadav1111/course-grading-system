import { Err, ErrResult, Result, okResult, errResult } from 'cs544-js-utils';

import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

export default function makeGradesWs(url: string) { return new GradesWs(url); }

export class GradesWs {
  private url;

  constructor(url: string) { this.url = url; }

  async getCourseGrades(courseId: string) : Promise<Result<G.Grades>> {
    const url = `${this.url}/grades/${courseId}`;
    const fetchResult: Result<G.RawTable|null> = await doFetchJson("GET", url);
    if (!fetchResult.isOk) return fetchResult;
    if (fetchResult.val === null) {
      return errResult(`no data returned for ${courseId}`, 'INTERNAL');
    }
    return GradesImpl.makeGradesWithData(courseId, fetchResult.val);
  }

  async updateCourseGrades(courseId: string, patches: G.Patches)
     : Promise<Result<G.Grades>>
  {
    const url = `${this.url}/grades/${courseId}`;
    const fetchResult: Result<G.RawTable|null> =
      await doFetchJson("PATCH", url, patches);
    if (!fetchResult.isOk) return fetchResult;
    if (fetchResult.val === null) {
      return errResult(`no data returned for ${courseId}`, 'INTERNAL');
    }
    return GradesImpl.makeGradesWithData(courseId, fetchResult.val);
  }
  
}

/** Return a Result for dispatching HTTP method to url.  If jsonBody
 *  is specified, then it should be sent as JSON.  
 *
 *  The response should return an error Result if there is a fetch
 *  error or if the response JSON contains errors.
 *
 *  If there are no errors and the response body is non-empty then the
 *  function should return the response body within an ok Result.
 *
 * If there are no errors and the response body is empty, the function
 * should return a null ok Result.  
 */
async function doFetchJson<T>(method: string, url: string,
			      jsonBody: object|null=null)
  : Promise<Result<T|null>> 
{
  const options: { [key: string]: any } = { method };
  if (jsonBody) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(jsonBody);
  }
  try {
    const response = await fetch(url, options);
    // if (!response.ok) {
    //   return errResult(`${method} ${url} status ${response.status}`);
    // }
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength === 0) {
      return okResult(null);
    }
    else {
      const data = await response.json();
      return (data.isOk) ? okResult(data.result) : new ErrResult(data.errors);
    }
  }
  catch (err) {
    console.error(err);
    return errResult(err);
  }
}

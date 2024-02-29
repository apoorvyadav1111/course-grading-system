import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

import { Err, Result, okResult, errResult, ErrResult } from 'cs544-js-utils';
import { GradeRow, RawRow } from 'cs544-prj1-sol/dist/lib/grade-table';

/** factory function to create an App and take care of any
 *  asynchronous initialization.
 */
export default async function makeApp(url: string) {
  const app = new App(url);
  // TODO: add any async initialization
  app.initTable();

}

class App {
  #wsUrl:string;
  #webService:ApiService;
  #form:HTMLFormElement;
  #error:HTMLLIElement;
  #gradeTable: HTMLTableElement;
  #courseInput: HTMLSelectElement;

  constructor(wsUrl: string) {
    //TODO
    //cache form HTMLElements as instance vars, set up handlers, web services

    // Web Service
    this.#wsUrl = wsUrl;
    this.#webService = new ApiService(this.#wsUrl);

    // HTMLElements
    this.#form  = document.querySelector('form#grades-form') as HTMLFormElement;
    this.#error = document.querySelector('#errors') as HTMLLIElement;
    this.#gradeTable = document.querySelector('#grades') as HTMLTableElement;
    this.#courseInput = document.querySelector('#course-id') as HTMLSelectElement;

    // Course Options
    coursesOptions().forEach(e => document.querySelector("#course-id")?.appendChild(e));

    // Setup Handlers
    this.#form.addEventListener('submit', (ev)=>{ev.preventDefault()});

    for( const sel of ['#course-id', '#student-id','#show-stats']){
      const element = document.querySelector(sel);
      element?.addEventListener('change', async (ev) =>{
        ev.preventDefault();
        const queryData: {[name: string]: string }=getFormData(this.#form);
        await this.getGrades(queryData);
      });
    }
  }

  //TODO: add methods/data as necessary.
  async getGrades(queryData:{ [name: string]: string }){
    this.#error.replaceChildren();
    this.#gradeTable.replaceChildren();
    const gradeObject = await this.#webService.getCourseGrades(queryData['courseId']);
    if(gradeObject===undefined)return;
    if(gradeObject.isOk===true){
      if(queryData['rowId']!==''){
        if(queryData['full']==='on'){
          const data = gradeObject.val.getFullTableRow(queryData['rowId']);
          if(data.isOk==true){
            this.makeGradesTable(data.val);
          }else{
            this.makeErrorList(data);
          }
        }else{
          const data = gradeObject.val.getRawTableRow(queryData['rowId']);
          if(data.isOk==true){
            this.makeGradesTable(data.val);
          }else{
            this.makeErrorList(data);
          }
        }
      }else{
        if(queryData['full']==='on'){
          const data = gradeObject.val.getFullTable();
          this.makeGradesTable(data);
        }else{
          const data = gradeObject.val.getRawTable();
          this.makeGradesTable(data);

        }
      }
    }else{
      this.makeErrorList(gradeObject);
    }
  }

  // Populates error list
  makeErrorList(err: ErrResult){
    for(const errItem of err.errors){
      const liItem = makeElement('li',{},errItem.message);
      this.#error.appendChild(liItem);
    }
  }

  // Generates Table
  makeGradesTable(data: GradeRow[]){
    if(data.length===0)return;
    const headers = Object.keys(data[0]);
    const trHeader =  makeElement('tr');
    this.#gradeTable.appendChild(trHeader);

    for(const heading of headers){
      const thItem = makeElement('th',{},heading);
      trHeader.appendChild(thItem);
    }
    for (const row of data){
      const rowData = Object.values(row);
      const trData = makeElement('tr');
      for(const cell of rowData){
        const tdItem = makeElement('td',{},round(cell).toString());
        trData.appendChild(tdItem);
      }
      this.#gradeTable.appendChild(trData);
    }
  }
  // Initialize table after page loads
  initTable(){
    this.#courseInput.dispatchEvent(new Event("change"));
  }

}

// TODO: add auxiliary functions / classes.

// Web Service Class
class ApiService{
  baseUrl:string;
  constructor(url:string){
    this.baseUrl = url;
  }

  // Fetches data from the route
  async getCourseGrades(courseId:string){
    try{
      const response = await fetch(`${this.baseUrl}/grades/${courseId}`);
      if(response.ok){
        const data = await response.json();
        if(data.isOk){
          const gradeImpl = GradesImpl.makeGradesWithData(courseId,data.result);
          return gradeImpl;
        }else{
          return errResult(data.errors);
        }
      }
    }
    catch(err){
      return errResult('Failed to Fetch');
    }
  }
}

// Rounds the decimal to at most one decimal
function round(grade:G.Grade):G.Grade{
  if(typeof grade === 'number'){
    return Math.round(grade*10)/10;
  }else{
    return grade;
  }
}
/** Return list of <option> elements for each course in COURSES with the
 *  value attribute of each element set to the courseId and the
 *  text set to the course name.
 */ 
function coursesOptions() {
  return Object.entries(COURSES).map(([courseId, courseInfo]) => {
    const descr = `${courseId}: ${courseInfo.name}`;
    return makeElement('option', {value: courseId}, descr);
  });
}

/** return object mapping widget names from form to their values */
function getFormData(form: HTMLFormElement) : { [name: string]: string } {
  const data = [... (new FormData(form).entries()) ]
      .map(([k, v]: [string, string]) => [k, v]);
  return Object.fromEntries(data);
}

/** Return a new DOM element with specified tagName, attributes
 *  given by object attrs and contained text.
 */
function makeElement(tagName: string, attrs: {[attr: string]: string} = {},
		     text='')
  : HTMLElement
{
  const element = document.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) {
    element.setAttribute(k, v);
  }
  if (text.length > 0) element.append(text);
  return element;
}






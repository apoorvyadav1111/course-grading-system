import React from 'react';

import { GradesWs } from '../lib/grades-ws.js';

import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

import { ErrResult, Result, errResult } from 'cs544-js-utils';
import { Patches } from 'cs544-prj1-sol/dist/lib/grade-table.js';

type GradesTableProps = {
  ws: GradesWs,
  courseId: string,
  courseInfo: C.CourseInfo,
  grades: G.Grades,
  setResult: (result: Result<G.Grades>) => void,
};

export default function GradesTable(props: GradesTableProps) {
  const { ws, courseId, courseInfo, grades, setResult } = props;
  const data = grades.getFullTable();
  if(data.length===0){
    return <><table><tbody></tbody></table></>
  }else{
    const hdrs = Object.keys(data[0]);
    const changeGradeHandler = async function (rowId: string, colId: string, val: string) {
      const colInfo = courseInfo.cols[colId];
      // console.log(rowId, colId, val)
      if (colInfo !== undefined && colInfo.kind === 'score') {
        const numVal: number = Number(val);
        // console.log(numVal,courseId, colInfo);
        if(isNaN(numVal)){
          const msg = `value for [${rowId}, ${colId}] should be a number`;
          setResult(errResult(msg));
        }
         else {
          const patch: Patches = { [rowId]: { [colId]: numVal } };
          const result = await ws.updateCourseGrades(courseId, patch);
          setResult(result);
        }
      }
    }
    
    return (
      <>
        <table>
          <thead>
            <Header hdrs={hdrs}/>
          </thead>
          <tbody>
            <DataTable data={data} courseInfo={courseInfo} changeGrade={changeGradeHandler} />
          </tbody>
        </table>
      </>
    ); 
  }
}

/* The following sub-components are based on the visual layout of
   a GradesTable:

     + A GradesTable will contain a Header and a DataTable.

     + A Header simply consists of a <tr> row containing <th> entries
       for each header.

     + A DataTable consists of a sequence of DataRow's.

     + A DataRow is a <tr> containing a sequence of <td> entries.
       Each <td> entry contains a GradeInput component or plain data
       depending on whether or not the entry should be editable.

     + A GradeInput will be a <input> widget which displays the current
       data and has change and blur handlers.  The change handler is
       used to reflect the DOM state of the <input> in the react state
       and the blur handler is used to trigger changes in the overall
       Grades component via the changeGrade prop.  
  
  Note that all the following sub-components are set up to return
  an empty fragment as a placeholder to keep TS happy.

*/

type HeaderProps = {
  hdrs: string[],
};

function Header(props: HeaderProps) {
  const thData = props.hdrs.map(d => <th key={d}>{d}</th>);
  return (<>
    <tr>
      {thData}
    </tr>
  </>);
}

type DataTableProps = {
  data: G.GradeRow[],
  courseInfo: C.CourseInfo,
  changeGrade: (rowId: string, colId: string, val: string) => void,
};

function DataTable(props: DataTableProps) {
  const { data, courseInfo, changeGrade } = props;
  const dataRows = data.map((d,i)=><DataRow key={i} dataRow={d} courseInfo={courseInfo} changeGrade={changeGrade}/>);
  return (
    <>
    {dataRows}
    </>
  );
}

type DataRowProps = {
  dataRow: G.GradeRow,
  courseInfo: C.CourseInfo,
  changeGrade: (rowId: string, colId: string, val: string) => void,
};

function DataRow(props: DataRowProps) {
  const {dataRow, courseInfo, changeGrade} = props;
  const row = Object.entries(dataRow);
  const rowIdColId:string = courseInfo.rowIdColId;
  const rowId = dataRow[rowIdColId] as string;
  const hasRowId = rowId !=='';
  const isStat = dataRow['$stat'] as string; 
  const htmlRow = row.map(d=>{
      if(d[1] instanceof ErrResult){
      return <td key={d[0]}></td>
      }else{
        const colId = d[0];
        const colInfo = courseInfo.cols[colId];
        if(!hasRowId && colInfo!==undefined && isStat==='Avg' && colInfo.kind==='score'){
          const value = Number(d[1]).toFixed(1);
          return <td key={d[0]}>{value}</td>
        }
        else if(colInfo!==undefined && colInfo.kind==='calc'){
          const value = Number(d[1]).toFixed(1);
          return <td key={d[0]}>{value}</td>
        }else if(hasRowId && colInfo!==undefined && colInfo.kind==='score'){
          const value = d[1].toString();
          return <td key={d[0]}><GradeInput rowId={rowId} colId={d[0]} val={value} changeGrade={changeGrade}/></td>
        }
        else{
          const value = d[1];
          return <td key={d[0]}>{value}</td>
        }
      }
    })
  return <><tr>{htmlRow}</tr></>;
}

type GradeInputProps = {
  rowId: string,
  colId: string,
  val: string,
  changeGrade: (rowId: string, colId: string, val: string) => void,
};

function GradeInput(props: GradeInputProps) {
  const { rowId, colId, val, changeGrade } = props;
  const [value, setValue] = React.useState(val);
  const oldValue = React.useRef(val);
  return <input type="text" value={value} size={3} onChange={
    (e) => {
      e.preventDefault();
      setValue(e.target.value);
    }}
    onBlur={(e)=>{
      if(oldValue.current!==value){
        oldValue.current=value;
        changeGrade(rowId,colId,value);
      }
    }}/>;
}

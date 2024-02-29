import React from 'react';

import { GradesWs } from '../lib/grades-ws.js';

import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

import { Result, errResult } from 'cs544-js-utils';

import GradesTable from './grades-table.js';

type GradesProps = {
  courseId: string,
  ws: GradesWs,
  courseInfo: C.CourseInfo,
};

export default function Grades(props: GradesProps) {
  const { courseId, ws, courseInfo } = props;
  const [ grades, setGrades ] = React.useState<G.Grades|null>(null);
  const [ errors, setErrors ] = React.useState<string[]>([]);
  React.useEffect(() => {
    setGrades(null);
    const fetch = async () => {
      const gradesResult = await ws.getCourseGrades(courseId);
      if (gradesResult.isOk) {
	setGrades(gradesResult.val);
      }
    };
    fetch();
  }, [courseId]);  //this dependency ensures a re-fetch when courseId changes
  const setResult = (result: Result<G.Grades>) => {
    if (result.isOk) {
      setGrades(result.val);
      setErrors([]);
    }
    else {
      setErrors(result.errors.map(e => e.message));
    }
  };
  
  return (grades === null)
    ? <></>
    : (
        <>
          <Errors errors={errors}/>
          <GradesTable {...props} grades={grades} setResult={setResult} />
        </>
      );
}

function Errors(props: { errors: string[] }) {
  const {errors} = props;
  return (
    <ul id="errors">
      {errors.map((e, i) => <li className="error" key={i}>{e}</li>)}
    </ul>
  );
}


import React from 'react';

import { CourseInfo as C, GradeTable as G, GradesImpl, COURSES }
  from 'cs544-prj1-sol';

import Grades from './grades.js';

import makeGradesWs from '../lib/grades-ws.js';

import { Result } from 'cs544-js-utils';

export default function App(props: {}) {
  const [ wsUrl, setWsUrl ] = React.useState('https://localhost:2345');
  const ws = makeGradesWs(wsUrl);
  const courseId0 = Object.keys(COURSES)[0];
  const [ courseId, setCourseId ] = React.useState(courseId0);
  const courseInfo = COURSES[courseId];
  //the following contains an example of an inline onChange handler.
  //note that it is not necessary to declare the type of its ev
  //parameter as TS can infer the type from its use.
  return (
    <>
      <form className="grid-form">
        <label htmlFor="ws-url">Grades Web Services Base URL</label>
        <input id="ws-url" value={wsUrl}
               onChange={ev => setWsUrl(ev.target.value)}/>
        <CourseSelect courseId={courseId} change={setCourseId}/>
      </form>
      <Grades ws={ws} courseId={courseId} courseInfo={courseInfo}/>
    </>
  );
}


type CourseSelectProps = {
  courseId: string,
  change: (courseId: string) => void,
}

function CourseSelect(props: CourseSelectProps) {
  const { courseId, change } = props;
  //it is necessary to declare the type of ev below as TS does not
  //appear to be smart enough to infer its type.
  const onChange =
    (ev: React.ChangeEvent<HTMLSelectElement>) => change(ev.target.value);
  const options = Object.entries(COURSES)
    .map(([id, courseInfo]) =>
      <option key={id} value={id}>{id}: {courseInfo.name}</option>);
  return (
    <>
      <label htmlFor="courseId">Course</label>
      <select id="courseId" value={courseId} onChange={onChange}>
        {options}
      </select>
    </>
  );
}

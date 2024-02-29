import * as G from './grade-table.js';

/** Sort grades first by `STAT_HDR` column ID, then by rowIdColId field. 
  * Rows with stat hdr fields always compare > than rows without
  * stat hdr fields.
  */
export function sortGrades(grades: G.GradeRow[], rowIdColId: string) {
  const statHdr = G.STAT_HDR;
  const lexCmp = (a: string, b: string) =>
    (a < b) ? -1 : (a > b) ? +1 : 0;
  return grades.sort((row1, row2) => {
    const stat1 = row1[statHdr] as string;
    const stat2 = row2[statHdr] as string;
    const id1 = row1[rowIdColId] as string;
    const id2 = row2[rowIdColId] as string;
    return lexCmp(stat1, stat2) || lexCmp(id1, id2);
  });
}

/** Given CSV content text, return array of objects corresponding
 *  to the data rows (the first row is assumed to be a header row).
 */
export function csvToObj(text: string, sep=',') : Object[] {
  let headers: string[];
  const data: Object[] = [];
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue;
    const vals = line.split(sep);
    if (!headers) {
      headers = vals;
    }
    else {
      const obj: {[id: string]: string|number} = {};
      vals.forEach((v, i) => {
	const val = (v.match(/^[-+]?\d+(\.\d*)?/)) ? Number(v) : v;
	//google sheets has trouble treating '' as 0, hence reconvert
	obj[headers[i]] = (val === 0) ? '' : val;
      });
      data.push(obj);
    }
  }
  return data;
}


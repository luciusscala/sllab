/**
 * The roster's vocabulary, matching the database's check constraints, and
 * its sort orders. Positions run back-to-front the way a lineup is read, classes
 * by seniority — sorting either alphabetically would produce a meaningless
 * order ("D, F, GK, MF"). Unknown values rank last rather than disappearing.
 */
export const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
export const CLASSES = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];
const POSITION_ORDER = POSITIONS;
const CLASS_ORDER = CLASSES;

const rankIn = (order: string[], value: string) => {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
};

export const positionRank = (position: string) =>
  rankIn(POSITION_ORDER, position);

export const classRank = (year: string) => rankIn(CLASS_ORDER, year);

/**
 * Squad numbers ascending with unnumbered players always last, in either
 * direction. Subtracting two Infinity placeholders would yield NaN, which
 * makes the comparator undefined, so nulls are handled before the subtraction.
 */
export function compareNumbers(
  a: number | null,
  b: number | null,
  factor = 1,
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * factor;
}


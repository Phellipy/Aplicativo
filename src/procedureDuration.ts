export const maximumProcedureMinutes = 9 * 60;
export function validProcedureDuration(minutes: number) {
  return (
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= maximumProcedureMinutes
  );
}

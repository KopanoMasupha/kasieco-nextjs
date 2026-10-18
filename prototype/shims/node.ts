export const join = (...a: string[]) => a.join("/");
export const readFileSync = () => { throw new Error("no fs"); };
export const writeFileSync = () => {};
export const mkdirSync = () => {};
export const renameSync = () => {};
export default { join, readFileSync, writeFileSync, mkdirSync, renameSync };

declare module 'spdx-satisfies' {
  function spdxSatisfies(candidate: string, allowList: string[]): boolean
  export = spdxSatisfies
}

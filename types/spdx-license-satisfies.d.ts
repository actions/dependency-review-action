declare module '@onebeyond/spdx-license-satisfies' {
  export function satisfies(
    candidateExpr: string,
    constraintExpr: string
  ): boolean

  export function satisfiesAny(
    candidateExpr: string,
    licenses: string[]
  ): boolean

  export function satisfiesAll(
    candidateExpr: string,
    licenses: string[]
  ): boolean

  export function isValid(candidateExpr: string): boolean
}

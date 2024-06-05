declare module '@onebeyond/spdx-license-satisfies' {
  export function satisfies(
    candidateExpr: string,
    constraintExpr: string
  ): boolean
}

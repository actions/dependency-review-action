// GitHub Action inputs come in the form of environment variables
// with an INPUT prefix (e.g. INPUT_FAIL-ON-SEVERITY)
export function setInput(input: string, value: string): void {
  process.env[`INPUT_${input.toUpperCase()}`] = value
}

// We want a clean ENV before each test. We use `delete`
// since we want `undefined` values and not empty strings.
export function clearInputs(): void {
  const allowedOptions = [
    'FAIL-ON-SEVERITY',
    'FAIL-ON-SCOPES',
    'ALLOW-LICENSES',
    'DENY-LICENSES',
    'ALLOW-GHSAS',
    'LICENSE-CHECK',
    'VULNERABILITY-CHECK',
    'CONFIG-FILE',
    'BASE-REF',
    'HEAD-REF',
    'COMMENT-SUMMARY-IN-PR',
    'WARN-ONLY',
    'DENY-GROUPS',
    'DENY-PACKAGES',
    'ALLOW-DEPENDENCIES-LICENSES'
  ]

  // eslint-disable-next-line github/array-foreach
  allowedOptions.forEach(option => {
    delete process.env[`INPUT_${option.toUpperCase()}`]
  })
}

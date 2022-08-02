import {expect, test, beforeEach} from '@jest/globals'
import {readConfig} from '../src/config'

// GitHub Action inputs come in the form of environment variables
// with an INPUT prefix (e.g. INPUT_FAIL-ON-SEVERITY)
function setInput(input: string, value: string) {
  process.env[`INPUT_${input.toUpperCase()}`] = value
}

// We want a clean ENV before each test. We use `delete`
// since we want `undefined` values and not empty strings.
function clearInputs() {
  for (var key of Object.keys(process.env)) {
    if (key.startsWith('INPUT_')) {
      delete process.env[key]
    }
  }
}

beforeEach(() => {
  clearInputs()
})

test('it defaults to low severity', async () => {
  const options = readConfig()
  expect(options.fail_on_severity).toEqual('low')
})

test('it reads custom configs', async () => {
  setInput('fail-on-severity', 'critical')
  setInput('allow-licenses', ' BSD, GPL 2')
  setInput('fail-on-violation', 'true')
  setInput('check-name-vulnerabilities', 'custom check name vulnerabilities')
  setInput('check-name-licenses', 'custom check name licenses')

  const options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')
  expect(options.allow_licenses).toEqual(['BSD', 'GPL 2'])
  expect(options.fail_on_violation).toBeTruthy()
  expect(options.check_name_vulnerability).toEqual(
    'custom check name vulnerabilities'
  )
  expect(options.check_name_license).toEqual('custom check name licenses')
})

test('it defaults to empty allow/deny lists ', async () => {
  const options = readConfig()

  expect(options.allow_licenses).toEqual(undefined)
  expect(options.deny_licenses).toEqual(undefined)
})

test('it defaults to false fail on violation', async () => {
  const options = readConfig()

  expect(options.fail_on_violation).toBeFalsy()
})

test('it raises an error if both an allow and denylist are specified', async () => {
  setInput('allow-licenses', 'MIT')
  setInput('deny-licenses', 'BSD')

  expect(() => readConfig()).toThrow()
})

test('it raises an error when given an unknown severity', async () => {
  setInput('fail-on-severity', 'zombies')
  expect(() => readConfig()).toThrow()
})

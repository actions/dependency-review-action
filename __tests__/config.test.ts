import {expect, test, beforeEach} from '@jest/globals'
import {readConfig, readConfigFile} from '../src/config'
import {getRefs} from '../src/git-refs'

// GitHub Action inputs come in the form of environment variables
// with an INPUT prefix (e.g. INPUT_FAIL-ON-SEVERITY)
function setInput(input: string, value: string) {
  process.env[`INPUT_${input.toUpperCase()}`] = value
}

// We want a clean ENV before each test. We use `delete`
// since we want `undefined` values and not empty strings.
function clearInputs() {
  const allowedOptions = [
    'FAIL-ON-SEVERITY',
    'ALLOW-LICENSES',
    'DENY-LICENSES',
    'CONFIG-FILE',
    'BASE-REF',
    'HEAD-REF'
  ]

  allowedOptions.forEach(option => {
    delete process.env[`INPUT_${option.toUpperCase()}`]
  })
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

  const options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')
  expect(options.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('it defaults to empty allow/deny lists ', async () => {
  const options = readConfig()

  expect(options.allow_licenses).toEqual(undefined)
  expect(options.deny_licenses).toEqual(undefined)
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

test('it uses the given refs when the event is not a pull request', async () => {
  setInput('base-ref', 'a-custom-base-ref')
  setInput('head-ref', 'a-custom-head-ref')

  const refs = getRefs(readConfig(), {
    payload: {},
    eventName: 'workflow_dispatch'
  })
  expect(refs.base).toEqual('a-custom-base-ref')
  expect(refs.head).toEqual('a-custom-head-ref')
})

test('it raises an error when no refs are provided and the event is not a pull request', async () => {
  const options = readConfig()
  expect(() =>
    getRefs(options, {
      payload: {},
      eventName: 'workflow_dispatch'
    })
  ).toThrow()
})

test('it reads an external config file', async () => {
  let options = readConfigFile('./__tests__/fixtures/config-allow-sample.yml')
  expect(options.fail_on_severity).toEqual('critical')
  expect(options.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('raises an error when the the config file was not found', async () => {
  expect(() => readConfigFile('fixtures/i-dont-exist')).toThrow()
})

test('it parses options from both sources', async () => {
  setInput('config-file', './__tests__/fixtures/config-allow-sample.yml')

  let options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')

  setInput('base-ref', 'a-custom-base-ref')
  options = readConfig()
  expect(options.base_ref).toEqual('a-custom-base-ref')
})

test('in case of conflicts, the external config is the source of truth', async () => {
  setInput('config-file', './__tests__/fixtures/config-allow-sample.yml') // this will set fail-on-severity to 'critical'

  let options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')

  // this should not overwite the previous value
  setInput('fail-on-severity', 'low')
  options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')
})

test('it uses the default values when loading external files', async () => {
  setInput('config-file', './__tests__/fixtures/no-licenses-config.yml')
  let options = readConfig()
  expect(options.allow_licenses).toEqual(undefined)
  expect(options.deny_licenses).toEqual(undefined)

  setInput('config-file', './__tests__/fixtures/license-config-sample.yml')
  options = readConfig()
  expect(options.fail_on_severity).toEqual('low')
})

test('it accepts an external configuration filename', async () => {
  setInput('config-file', './__tests__/fixtures/no-licenses-config.yml')
  const options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')
})

test('it raises an error when given an unknown severity in an external config file', async () => {
  setInput('config-file', './__tests__/fixtures/invalid-severity-config.yml')
  expect(() => readConfig()).toThrow()
})

import {expect, test, beforeEach} from '@jest/globals'
import {readConfig} from '../src/config'
import {getRefs} from '../src/git-refs'
import * as Utils from '../src/utils'

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
    'FAIL-ON-SCOPES',
    'ALLOW-LICENSES',
    'DENY-LICENSES',
    'ALLOW-GHSAS',
    'LICENSE-CHECK',
    'VULNERABILITY-CHECK',
    'CONFIG-FILE',
    'BASE-REF',
    'HEAD-REF'
  ]

  allowedOptions.forEach(option => {
    delete process.env[`INPUT_${option.toUpperCase()}`]
  })
}

beforeAll(() => {
  jest.spyOn(Utils, 'isSPDXValid').mockReturnValue(true)
})

beforeEach(() => {
  clearInputs()
})

test('it defaults to low severity', async () => {
  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('low')
})

test('it reads custom configs', async () => {
  setInput('fail-on-severity', 'critical')
  setInput('allow-licenses', ' BSD, GPL 2')

  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')
  expect(config.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('it defaults to empty allow/deny lists ', async () => {
  const config = await readConfig()

  expect(config.allow_licenses).toEqual(undefined)
  expect(config.deny_licenses).toEqual(undefined)
})

test('it raises an error if both an allow and denylist are specified', async () => {
  setInput('allow-licenses', 'MIT')
  setInput('deny-licenses', 'BSD')

  await expect(readConfig()).rejects.toThrow(
    'You cannot specify both allow-licenses and deny-licenses'
  )
})
test('it raises an error if an empty allow list is specified', async () => {
  setInput('config-file', './__tests__/fixtures/config-empty-allow-sample.yml')

  await expect(readConfig()).rejects.toThrow(
    'You should provide at least one license in allow-licenses'
  )
})

test('it raises an error when given an unknown severity', async () => {
  setInput('fail-on-severity', 'zombies')

  await expect(readConfig()).rejects.toThrow(/received 'zombies'/)
})

test('it uses the given refs when the event is not a pull request', async () => {
  setInput('base-ref', 'a-custom-base-ref')
  setInput('head-ref', 'a-custom-head-ref')

  const refs = getRefs(await readConfig(), {
    payload: {},
    eventName: 'workflow_dispatch'
  })
  expect(refs.base).toEqual('a-custom-base-ref')
  expect(refs.head).toEqual('a-custom-head-ref')
})

test('it raises an error when no refs are provided and the event is not a pull request', async () => {
  const config = await readConfig()
  expect(() =>
    getRefs(config, {
      payload: {},
      eventName: 'workflow_dispatch'
    })
  ).toThrow()
})

test('it reads an external config file', async () => {
  setInput('config-file', './__tests__/fixtures/config-allow-sample.yml')

  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')
  expect(config.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('raises an error when the config file was not found', async () => {
  setInput('config-file', 'fixtures/i-dont-exist')
  await expect(readConfig()).rejects.toThrow(/Unable to fetch/)
})

test('it parses options from both sources', async () => {
  setInput('config-file', './__tests__/fixtures/config-allow-sample.yml')

  let config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')

  setInput('base-ref', 'a-custom-base-ref')
  config = await readConfig()
  expect(config.base_ref).toEqual('a-custom-base-ref')
})

test('in case of conflicts, the inline config is the source of truth', async () => {
  setInput('fail-on-severity', 'low')
  setInput('config-file', './__tests__/fixtures/config-allow-sample.yml') // this will set fail-on-severity to 'critical'

  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('low')
})

test('it uses the default values when loading external files', async () => {
  setInput('config-file', './__tests__/fixtures/no-licenses-config.yml')
  let config = await readConfig()
  expect(config.allow_licenses).toEqual(undefined)
  expect(config.deny_licenses).toEqual(undefined)

  setInput('config-file', './__tests__/fixtures/license-config-sample.yml')
  config = await readConfig()
  expect(config.fail_on_severity).toEqual('low')
})

test('it accepts an external configuration filename', async () => {
  setInput('config-file', './__tests__/fixtures/no-licenses-config.yml')
  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')
})

test('it raises an error when given an unknown severity in an external config file', async () => {
  setInput('config-file', './__tests__/fixtures/invalid-severity-config.yml')
  await expect(readConfig()).rejects.toThrow()
})

test('it defaults to runtime scope', async () => {
  const config = await readConfig()
  expect(config.fail_on_scopes).toEqual(['runtime'])
})

test('it parses custom scopes preference', async () => {
  setInput('fail-on-scopes', 'runtime, development')
  let config = await readConfig()
  expect(config.fail_on_scopes).toEqual(['runtime', 'development'])

  clearInputs()
  setInput('fail-on-scopes', 'development')
  config = await readConfig()
  expect(config.fail_on_scopes).toEqual(['development'])
})

test('it raises an error when given invalid scope', async () => {
  setInput('fail-on-scopes', 'runtime, zombies')
  await expect(readConfig()).rejects.toThrow(/received 'zombies'/)
})

test('it defaults to an empty GHSA allowlist', async () => {
  const config = await readConfig()
  expect(config.allow_ghsas).toEqual([])
})

test('it successfully parses GHSA allowlist', async () => {
  setInput('allow-ghsas', 'GHSA-abcd-1234-5679, GHSA-efgh-1234-5679')
  const config = await readConfig()
  expect(config.allow_ghsas).toEqual([
    'GHSA-abcd-1234-5679',
    'GHSA-efgh-1234-5679'
  ])
})

test('it defaults to checking licenses', async () => {
  const config = await readConfig()
  expect(config.license_check).toBe(true)
})

test('it parses the license-check input', async () => {
  setInput('license-check', 'false')
  let config = await readConfig()
  expect(config.license_check).toEqual(false)

  clearInputs()
  setInput('license-check', 'true')
  config = await readConfig()
  expect(config.license_check).toEqual(true)
})

test('it defaults to checking vulnerabilities', async () => {
  const config = await readConfig()
  expect(config.vulnerability_check).toBe(true)
})

test('it parses the vulnerability-check input', async () => {
  setInput('vulnerability-check', 'false')
  let config = await readConfig()
  expect(config.vulnerability_check).toEqual(false)

  clearInputs()
  setInput('vulnerability-check', 'true')
  config = await readConfig()
  expect(config.vulnerability_check).toEqual(true)
})

test('it is not possible to disable both checks', async () => {
  setInput('license-check', 'false')
  setInput('vulnerability-check', 'false')
  await expect(readConfig()).rejects.toThrow(
    /Can't disable both license-check and vulnerability-check/
  )
})

test('it supports comma-separated lists', async () => {
  setInput(
    'config-file',
    './__tests__/fixtures/inline-license-config-sample.yml'
  )
  let config = await readConfig()

  expect(config.allow_licenses).toEqual(['MIT', 'GPL-2.0-only'])
})

describe('licenses that are not valid SPDX licenses', () => {
  beforeAll(() => {
    jest.spyOn(Utils, 'isSPDXValid').mockReturnValue(false)
  })

  test('it raises an error for invalid licenses in allow-licenses', async () => {
    setInput('allow-licenses', ' BSD, GPL 2')
    await expect(readConfig()).rejects.toThrow(
      'Invalid license(s) in allow-licenses: BSD,GPL 2'
    )
  })

  test('it raises an error for invalid licenses in deny-licenses', async () => {
    setInput('deny-licenses', ' BSD, GPL 2')
    await expect(readConfig()).rejects.toThrow(
      'Invalid license(s) in deny-licenses: BSD,GPL 2'
    )
  })
})

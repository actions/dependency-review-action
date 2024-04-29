import {expect, test, beforeEach} from '@jest/globals'
import {readConfig} from '../src/config'
import {getRefs} from '../src/git-refs'
import * as Utils from '../src/utils'
import {setInput, clearInputs} from './test-helpers'

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

test('it defaults to false for warn-only', async () => {
  const config = await readConfig()
  expect(config.warn_only).toEqual(false)
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

test('it raises an error when an invalid package-url is used for deny-packages', async () => {
  setInput('deny-packages', 'not-a-purl')

  await expect(readConfig()).rejects.toThrow(`Error parsing package-url`)
})

test('it raises an error when a nameless package-url is used for deny-packages', async () => {
  setInput('deny-packages', 'pkg:npm/@namespace/')

  await expect(readConfig()).rejects.toThrow(
    `Error parsing package-url: name is required`
  )
})

test('it raises an error when an argument to deny-groups is missing a namespace', async () => {
  setInput('deny-groups', 'pkg:npm/my-fun-org')

  await expect(readConfig()).rejects.toThrow(
    `package-url must have a namespace`
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

test('it parses the comment-summary-in-pr input', async () => {
  setInput('comment-summary-in-pr', 'true')
  let config = await readConfig()
  expect(config.comment_summary_in_pr).toBe('always')

  clearInputs()
  setInput('comment-summary-in-pr', 'false')
  config = await readConfig()
  expect(config.comment_summary_in_pr).toBe('never')

  clearInputs()
  setInput('comment-summary-in-pr', 'always')
  config = await readConfig()
  expect(config.comment_summary_in_pr).toBe('always')

  clearInputs()
  setInput('comment-summary-in-pr', 'never')
  config = await readConfig()
  expect(config.comment_summary_in_pr).toBe('never')

  clearInputs()
  setInput('comment-summary-in-pr', 'on-failure')
  config = await readConfig()
  expect(config.comment_summary_in_pr).toBe('on-failure')
})

test('it successfully parses allow-dependencies-licenses', async () => {
  setInput(
    'allow-dependencies-licenses',
    'pkg:npm/strip-ansi@6.0.1, pkg:npm/wrap-ansi@7.0.0'
  )
  const config = await readConfig()
  expect(config.allow_dependencies_licenses).toEqual([
    'pkg:npm/strip-ansi@6.0.1',
    'pkg:npm/wrap-ansi@7.0.0'
  ])
})

test('it raises an error if invalid purl_url is included in allow-dependencies-licenses', async () => {
  setInput('allow-dependencies-licenses', 'invalid')
  await expect(readConfig()).rejects.toThrow(
    /Invalid purl\(s\) in allow-dependencies-licenses:/
  )
})

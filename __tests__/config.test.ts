import * as core from '@actions/core'
import {expect, test, jest, beforeEach} from '@jest/globals'
import {readConfig} from '../src/config'

beforeEach(() => {
  // reset to our defaults after every test run
  // TODO find out what the proper way of passing action inputs in tests is
  delete process.env['INPUT_FAIL-ON-SEVERITY']
  delete process.env['INPUT_ALLOW-LICENSES']
  delete process.env['INPUT_DENY-LICENSES']
})

test('it defaults to low severity', async () => {
  const options = readConfig()
  expect(options.fail_on_severity).toEqual('low')
})

test('it reads custom configs', async () => {
  process.env['INPUT_FAIL-ON-SEVERITY'] = 'critical'
  process.env['INPUT_ALLOW-LICENSES'] = ' BSD, GPL 2 '

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
  process.env['INPUT_ALLOW-LICENSES'] = 'MIT'
  process.env['INPUT_DENY-LICENSES'] = 'BSD'
  expect(() => readConfig()).toThrow()
})

test('it raises an error when given an unknown severity', async () => {
  process.env['INPUT_FAIL-ON-SEVERITY'] = 'zombies!'
  expect(() => readConfig()).toThrow()
})

test('it works on uppercase severities', async () => {
  process.env['INPUT_FAIL-ON-SEVERITY'] = 'CRITICAL'
  const options = readConfig()
  expect(options.fail_on_severity).toEqual('critical')
})

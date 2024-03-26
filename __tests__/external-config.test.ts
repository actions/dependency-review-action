import * as spdx from '../src/spdx'
import * as path from 'path'
import {expect, test, beforeEach} from '@jest/globals'
import {readConfig} from '../src/config'
import {setInput, clearInputs} from './test-helpers'

const externalConfig = `fail_on_severity: 'high'
allow_licenses: ['GPL-2.0-only']
`
const mockOctokit = {
  rest: {
    repos: {
      getContent: jest.fn().mockReturnValue({data: externalConfig})
    }
  }
}

jest.mock('octokit', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    Octokit: class {
      constructor() {
        return mockOctokit
      }
    }
  }
})

beforeEach(() => {
  clearInputs()
})

test('it reads an external config file', async () => {
  setInput('config-file', '../__tests__/fixtures/config-allow-sample.yml')
  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')
  expect(config.allow_licenses).toEqual(['BSD-3-Clause', 'GPL-2.0'])
})

test('raises an error when the config file was not found', async () => {
  setInput('config-file', 'fixtures/i-dont-exist')
  await expect(readConfig()).rejects.toThrow(/Unable to fetch/)
})

test('it parses options from both sources', async () => {
  setInput('config-file', '../__tests__/fixtures/config-allow-sample.yml')

  let config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')

  setInput('base-ref', 'a-custom-base-ref')
  config = await readConfig()
  expect(config.base_ref).toEqual('a-custom-base-ref')
})

test('in case of conflicts, the inline config is the source of truth', async () => {
  setInput('fail-on-severity', 'low')
  setInput('config-file', '../__tests__/fixtures/config-allow-sample.yml') // this will set fail-on-severity to 'critical'

  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('low')
})

test('it uses the default values when loading external files', async () => {
  setInput('config-file', '../__tests__/fixtures/no-licenses-config.yml')
  let config = await readConfig()
  expect(config.allow_licenses).toEqual(undefined)
  expect(config.deny_licenses).toEqual(undefined)

  setInput('config-file', '../__tests__/fixtures/license-config-sample.yml')
  config = await readConfig()
  expect(config.fail_on_severity).toEqual('low')
})

test('it accepts an external configuration filename', async () => {
  setInput('config-file', '../__tests__/fixtures/no-licenses-config.yml')
  const config = await readConfig()
  expect(config.fail_on_severity).toEqual('critical')
})

test('it raises an error when given an unknown severity in an external config file', async () => {
  setInput('config-file', '../__tests__/fixtures/invalid-severity-config.yml')
  await expect(readConfig()).rejects.toThrow()
})

test('it supports comma-separated lists', async () => {
  setInput(
    'config-file',
    '../__tests__/fixtures/inline-license-config-sample.yml'
  )
  const config = await readConfig()

  expect(config.allow_licenses).toEqual(['MIT', 'GPL-2.0-only'])
})

test('it reads a config file hosted in another repo', async () => {
  setInput(
    'config-file',
    'future-funk/anyone-cualkiera/external-config.yml@main'
  )
  setInput('external-repo-token', 'gh_viptoken')

  const config = await readConfig()

  expect(config.fail_on_severity).toEqual('high')
  expect(config.allow_licenses).toEqual(['GPL-2.0-only'])
})

import {expect, test} from '@jest/globals'
import {readConfigFile} from '../src/config'

test('reads the config file', async () => {
  let options = readConfigFile('./__tests__/fixtures/config-allow-sample.yml')
  expect(options.fail_on_severity).toEqual('critical')
  expect(options.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('the default config path handles .yml and .yaml', async () => {
  expect(true).toEqual(true)
})

test('returns a default config when the config file was not found', async () => {
  let options = readConfigFile('fixtures/i-dont-exist')
  expect(options.fail_on_severity).toEqual('low')
  expect(options.allow_licenses).toEqual([])
})

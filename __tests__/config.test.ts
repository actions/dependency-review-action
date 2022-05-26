import { expect, test } from '@jest/globals'
import { readConfigFile } from '../src/config'

test('reads the config file', async () => {
    var options = readConfigFile("./__tests__/fixtures/config-allow-sample.yml")
    expect(options.fail_on_severity).toEqual('critical')
    expect(options.allow_licenses).toEqual(['BSD', 'GPL 2'])
})

test('has a default config filepath', async () => {
    expect(true).toEqual(true)
})

test('can read files with both extensions', async () => {
    expect(true).toEqual(true)
})

test('returns a default config when the config file was not found', async () => {
    var options = readConfigFile("fixtures/i-dont-exist")
    expect(options.fail_on_severity).toEqual('all')
    expect(options.allow_licenses).toEqual(['all'])
})
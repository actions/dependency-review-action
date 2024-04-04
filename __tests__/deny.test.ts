import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {
  createMavenTestChange,
  createPipTestChange,
  createRubyTestChange,
  createTestChange
} from './fixtures/create-test-change'

jest.mock('@actions/core')

const mockOctokit = {
  rest: {
    licenses: {
      getForRepo: jest
        .fn()
        .mockReturnValue({data: {license: {spdx_id: 'AGPL'}}})
    }
  }
}

let getDeniedChanges: Function
let npmChange: Change
let rubyChange: Change
let pipChange: Change
let mvnChange: Change

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

beforeEach(async () => {
  jest.resetModules()
  jest.doMock('spdx-satisfies', () => {
    // mock spdx-satisfies return value
    // true for BSD, false for all others
    return jest.fn((license: string, _: string): boolean => license === 'BSD')
  })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ;({getDeniedChanges} = require('../src/deny'))

  npmChange = createTestChange()
  rubyChange = createRubyTestChange()
  pipChange = createPipTestChange()
  mvnChange = createMavenTestChange()
})

test('denies packages from the deny packages list', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    ['pkg:gem/actionsomething@3.2.0'],
    []
  )

  expect(deniedChanges[0]).toBe(rubyChange)
  expect(deniedChanges.length).toEqual(1)
})

test('denies packages only for the specified version from deny packages list', async () => {
  const packageWithDifferentVersion = 'pkg:npm/lodash@1.2.3'
  const changes: Changes = [npmChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    [packageWithDifferentVersion],
    []
  )

  expect(deniedChanges.length).toEqual(0)
})

test('if no specified version from deny packages list, it will treat package as wildcard and deny all versions', async () => {
  const changes: Changes = [
    createTestChange({name: 'lodash', version: '1.2.3'}),
    createTestChange({name: 'lodash', version: '4.5.6'}),
    createTestChange({name: 'lodash', version: '7.8.9'})
  ]
  const denyAllLodashVersions = 'pkg:npm/lodash'
  const deniedChanges = await getDeniedChanges(
    changes,
    [denyAllLodashVersions],
    []
  )

  expect(deniedChanges.length).toEqual(3)
})

test('denies packages from the deny group list', async () => {
  const changes: Changes = [mvnChange, rubyChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    [],
    ['pkg:maven/org.apache.logging.log4j']
  )

  expect(deniedChanges[0]).toBe(mvnChange)
  expect(deniedChanges.length).toEqual(1)
})

test('allows packages not defined in the deny packages and groups list', async () => {
  const changes: Changes = [npmChange, pipChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    ['pkg:gem/not-in-list@1.0.0'],
    ['pkg:maven:org.apache.logging.not-in-list']
  )

  expect(deniedChanges.length).toEqual(0)
})

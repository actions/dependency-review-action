import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {
  createTestChange,
  createTestGroupPURLs,
  createTestPackagePURLs
} from './fixtures/create-test-change'
import {getDeniedChanges} from '../src/deny'

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

  npmChange = createTestChange({ecosystem: 'npm'})
  rubyChange = createTestChange({ecosystem: 'rubygems'})
  pipChange = createTestChange({ecosystem: 'pip'})
  mvnChange = createTestChange({ecosystem: 'maven'})
})

test('denies packages from the deny packages list', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const deniedPackages = createTestPackagePURLs([
    'pkg:gem/actionsomething@3.2.0'
  ])
  const deniedChanges = await getDeniedChanges(changes, deniedPackages)

  expect(deniedChanges[0]).toBe(rubyChange)
  expect(deniedChanges.length).toEqual(1)
})

test('denies packages only for the specified version from deny packages list', async () => {
  const deniedPackageWithDifferentVersion = createTestPackagePURLs([
    'pkg:npm/lodash@1.2.3'
  ])
  const changes: Changes = [npmChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    deniedPackageWithDifferentVersion
  )

  expect(deniedChanges.length).toEqual(0)
})

test('if no specified version from deny packages list, it will treat package as wildcard and deny all versions', async () => {
  const changes: Changes = [
    createTestChange({name: 'lodash', version: '1.2.3'}),
    createTestChange({name: 'lodash', version: '4.5.6'}),
    createTestChange({name: 'lodash', version: '7.8.9'})
  ]
  const denyAllLodashVersions = createTestPackagePURLs(['pkg:npm/lodash'])
  const deniedChanges = await getDeniedChanges(changes, denyAllLodashVersions)

  expect(deniedChanges.length).toEqual(3)
})

test('denies packages from the deny group list', async () => {
  const changes: Changes = [mvnChange, rubyChange]
  const deniedGroups = createTestGroupPURLs([
    'pkg:maven/org.apache.logging.log4j/'
  ])
  const deniedChanges = await getDeniedChanges(changes, [], deniedGroups)

  expect(deniedChanges[0]).toBe(mvnChange)
  expect(deniedChanges.length).toEqual(1)
})

test('denies packages that match the deny group list exactly', async () => {
  const changes: Changes = [
    createTestChange({
      package_url: 'pkg:npm/org.test.pass/pass-this@1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      package_url: 'pkg:npm/org.test/deny-this@1.0.0',
      ecosystem: 'npm'
    })
  ]
  const deniedGroups = createTestGroupPURLs(['pkg:npm/org.test/'])
  const deniedChanges = await getDeniedChanges(changes, [], deniedGroups)

  expect(deniedChanges.length).toEqual(1)
  expect(deniedChanges[0]).toBe(changes[1])
})

test('allows packages not defined in the deny packages and groups list', async () => {
  const changes: Changes = [npmChange, pipChange]
  const deniedPackages = createTestPackagePURLs([
    'pkg:gem/package-not-in-changes@1.0.0'
  ])
  const deniedGroups = createTestGroupPURLs(['pkg:maven/group.not.in.changes/'])
  const deniedChanges = await getDeniedChanges(
    changes,
    deniedPackages,
    deniedGroups
  )

  expect(deniedChanges.length).toEqual(0)
})

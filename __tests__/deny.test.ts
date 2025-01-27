import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {createTestChange, createTestPURLs} from './fixtures/create-test-change'
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

  npmChange = createTestChange({ecosystem: 'npm'})
  rubyChange = createTestChange({ecosystem: 'rubygems'})
  pipChange = createTestChange({ecosystem: 'pip'})
  mvnChange = createTestChange({ecosystem: 'maven'})
})

test('denies packages from the deny packages list', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const deniedPackages = createTestPURLs(['pkg:gem/actionsomething@3.2.0'])
  const deniedChanges = await getDeniedChanges(changes, deniedPackages)

  expect(deniedChanges[0]).toBe(rubyChange)
  expect(deniedChanges.length).toEqual(1)
})

test('denies packages only for the specified version from deny packages list', async () => {
  const deniedPackageWithDifferentVersion = createTestPURLs([
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
  const denyAllLodashVersions = createTestPURLs(['pkg:npm/lodash'])
  const deniedChanges = await getDeniedChanges(changes, denyAllLodashVersions)

  expect(deniedChanges.length).toEqual(3)
})

test('denies packages from the deny group list', async () => {
  const changes: Changes = [mvnChange, rubyChange]
  const deniedGroups = createTestPURLs(['pkg:maven/org.apache.logging.log4j/'])
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
  const deniedGroups = createTestPURLs(['pkg:npm/org.test/'])
  const deniedChanges = await getDeniedChanges(changes, [], deniedGroups)

  expect(deniedChanges.length).toEqual(1)
  expect(deniedChanges[0]).toBe(changes[1])
})

test(`denies packages using the namespace from the name when there's no package_url`, async () => {
  const changes: Changes = [
    createTestChange({
      package_url: 'pkg:npm/org.test.pass/pass-this@1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      name: 'org.test:deny-this',
      package_url: '',
      ecosystem: 'maven'
    })
  ]
  const deniedGroups = createTestPURLs(['pkg:maven/org.test/'])
  const deniedChanges = await getDeniedChanges(changes, [], deniedGroups)

  expect(deniedChanges.length).toEqual(1)
  expect(deniedChanges[0]).toBe(changes[1])
})

test('allows packages not defined in the deny packages and groups list', async () => {
  const changes: Changes = [npmChange, pipChange]
  const deniedPackages = createTestPURLs([
    'pkg:gem/package-not-in-changes@1.0.0'
  ])
  const deniedGroups = createTestPURLs(['pkg:maven/group.not.in.changes/'])
  const deniedChanges = await getDeniedChanges(
    changes,
    deniedPackages,
    deniedGroups
  )

  expect(deniedChanges.length).toEqual(0)
})

test('deny packages does not prevent removal of denied packages', async () => {
  const changes: Changes = [
    createTestChange({
      change_type: 'added',
      name: 'deny-by-name-and-version',
      version: '1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      change_type: 'removed',
      name: 'pass-by-name-and-version',
      version: '1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      change_type: 'added',
      name: 'deny-by-name',
      version: '1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      change_type: 'removed',
      name: 'pass-by-name',
      version: '1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      change_type: 'added',
      package_url: 'pkg:npm/org.test.deny.by.namespace/only@1.0.0',
      ecosystem: 'npm'
    }),
    createTestChange({
      change_type: 'removed',
      package_url: 'pkg:npm/org.test.pass.by.namespace/only@1.0.0',
      ecosystem: 'npm'
    })
  ]
  const deniedPackages = createTestPURLs([
    'pkg:npm/org.test.deny.by/deny-by-name-and-version@1.0.0',
    'pkg:npm/org.test.pass.by/pass-by-name-and-version@1.0.0',
    'pkg:npm/org.test.deny.by/deny-by-name',
    'pkg:npm/org.test.pass.by/pass-by-name'
  ])
  const deniedGroups = createTestPURLs([
    'pkg:npm/org.test.deny.by.namespace/',
    'pkg:npm/org.test.pass.by.namespace/'
  ])
  const deniedChanges = await getDeniedChanges(
    changes,
    deniedPackages,
    deniedGroups
  )

  expect(deniedChanges.length).toEqual(3)
  expect(deniedChanges[0]).toBe(changes[0])
  expect(deniedChanges[1]).toBe(changes[2])
  expect(deniedChanges[2]).toBe(changes[4])
})

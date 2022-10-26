import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {getDeniedLicenseChanges} from '../src/licenses'

let npmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'Reeuhq',
  version: '1.0.2',
  package_url: 'pkg:npm/reeuhq@1.0.2',
  license: 'MIT',
  source_repository_url: 'github.com/some-repo',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'first-random_string',
      advisory_summary: 'very dangerous',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

let rubyChange: Change = {
  change_type: 'added',
  manifest: 'Gemfile.lock',
  ecosystem: 'rubygems',
  name: 'actionsomething',
  version: '3.2.0',
  package_url: 'pkg:gem/actionsomething@3.2.0',
  license: 'BSD',
  source_repository_url: 'github.com/some-repo',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'moderate',
      advisory_ghsa_id: 'second-random_string',
      advisory_summary: 'not so dangerous',
      advisory_url: 'github.com/future-funk'
    },
    {
      severity: 'low',
      advisory_ghsa_id: 'third-random_string',
      advisory_summary: 'dont page me',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

jest.mock('@actions/core')
jest.mock('spdx-satisfies', () => {
  return {
    __esModule: true,
    // hack to coerce / mock spdx-satisfies to return value
    // true for BSD, false for all others
    // affects only deny_licenses and allow_licenses checks
    default: (license: string, _: string): boolean => license === 'BSD'
  }
})

const mockOctokit = {
  rest: {
    licenses: {
      getForRepo: jest
        .fn()
        .mockReturnValue({data: {license: {spdx_id: 'AGPL'}}})
    }
  }
}

jest.mock('octokit', () => {
  return {
    Octokit: class {
      constructor() {
        return mockOctokit
      }
    }
  }
})

test('it fails if a license outside the allow list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges, _] = await getDeniedLicenseChanges(changes, {
    allow: ['BSD']
  })
  expect(invalidChanges[0]).toBe(npmChange)
})

test('it fails if a license inside the deny list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges] = await getDeniedLicenseChanges(changes, {
    deny: ['BSD']
  })
  expect(invalidChanges[0]).toBe(rubyChange)
})

// This is more of a "here's a behavior that might be surprising" than an actual
// thing we want in the system. Please remove this test after refactoring.
test('it fails all license checks when allow is provided an empty array', async () => {
  const changes: Changes = [npmChange, rubyChange]
  let [invalidChanges, _] = await getDeniedLicenseChanges(changes, {
    allow: [],
    deny: ['BSD']
  })
  expect(invalidChanges.length).toBe(2)
})

test('it does not fail if a license outside the allow list is found in removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    {...rubyChange, change_type: 'removed'}
  ]
  const [invalidChanges, _] = await getDeniedLicenseChanges(changes, {
    allow: ['BSD']
  })
  expect(invalidChanges).toStrictEqual([])
})

test('it does not fail if a license inside the deny list is found in removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    {...rubyChange, change_type: 'removed'}
  ]
  const [invalidChanges, _] = await getDeniedLicenseChanges(changes, {
    deny: ['BSD']
  })
  expect(invalidChanges).toStrictEqual([])
})

test('it fails if a license outside the allow list is found in both of added and removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    npmChange,
    {...rubyChange, change_type: 'removed'}
  ]
  const [invalidChanges, _] = await getDeniedLicenseChanges(changes, {
    allow: ['BSD']
  })
  expect(invalidChanges).toStrictEqual([npmChange])
})

describe('GH License API fallback', () => {
  test('it calls licenses endpoint if atleast one of the changes has null license and valid source_repository_url', async () => {
    const nullLicenseChange = {
      ...npmChange,
      license: null,
      source_repository_url: 'http://github.com/some-owner/some-repo'
    }
    const [_, unknownChanges] = await getDeniedLicenseChanges(
      [nullLicenseChange, rubyChange],
      {}
    )

    expect(mockOctokit.rest.licenses.getForRepo).toHaveBeenNthCalledWith(1, {
      owner: 'some-owner',
      repo: 'some-repo'
    })
    expect(unknownChanges.length).toEqual(0)
  })

  test('it does not call licenses API endpoint for change with null license and invalid source_repository_url ', async () => {
    const [_, unknownChanges] = await getDeniedLicenseChanges(
      [{...npmChange, license: null}],
      {}
    )
    expect(mockOctokit.rest.licenses.getForRepo).not.toHaveBeenCalled()
    expect(unknownChanges.length).toEqual(1)
  })

  test('it does not call licenses API endpoint if licenses for all changes are present', async () => {
    const [_, unknownChanges] = await getDeniedLicenseChanges(
      [npmChange, rubyChange],
      {}
    )

    expect(mockOctokit.rest.licenses.getForRepo).not.toHaveBeenCalled()
    expect(unknownChanges.length).toEqual(0)
  })
})

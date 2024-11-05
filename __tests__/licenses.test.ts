import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {getInvalidLicenseChanges} from '../src/licenses'

const npmChange: Change = {
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

const rubyChange: Change = {
  change_type: 'added',
  manifest: 'Gemfile.lock',
  ecosystem: 'rubygems',
  name: 'actionsomething',
  version: '3.2.0',
  package_url: 'pkg:gem/actionsomething@3.2.0',
  license: 'BSD-3-Clause',
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

const pipChange: Change = {
  change_type: 'added',
  manifest: 'requirements.txt',
  ecosystem: 'pip',
  name: 'package-1',
  version: '1.1.1',
  package_url: 'pkg:pypi/package-1@1.1.1',
  license: 'MIT',
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
})

test('it adds license outside the allow list to forbidden changes', async () => {
  const changes: Changes = [
    npmChange, // MIT license
    rubyChange // BSD license
  ]

  const {forbidden} = await getInvalidLicenseChanges(changes, {
    allow: ['BSD-3-Clause']
  })

  expect(forbidden[0]).toBe(npmChange)
  expect(forbidden.length).toEqual(1)
})

test('it adds license inside the deny list to forbidden changes', async () => {
  const changes: Changes = [
    npmChange, // MIT license
    rubyChange // BSD license
  ]

  const {forbidden} = await getInvalidLicenseChanges(changes, {
    deny: ['BSD-3-Clause']
  })

  expect(forbidden[0]).toBe(rubyChange)
  expect(forbidden.length).toEqual(1)
})

test('it does not add license outside the allow list to forbidden changes if it is in removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    {...rubyChange, change_type: 'removed'}
  ]
  const {forbidden} = await getInvalidLicenseChanges(changes, {
    allow: ['BSD-3-Clause']
  })
  expect(forbidden).toStrictEqual([])
})

test('it does not add license inside the deny list to forbidden changes if it is in removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    {...rubyChange, change_type: 'removed'}
  ]
  const {forbidden} = await getInvalidLicenseChanges(changes, {
    deny: ['BSD-3-Clause']
  })
  expect(forbidden).toStrictEqual([])
})

test('it adds license outside the allow list to forbidden changes if it is in both added and removed changes', async () => {
  const changes: Changes = [
    {...npmChange, change_type: 'removed'},
    npmChange,
    {...rubyChange, change_type: 'removed'}
  ]
  const {forbidden} = await getInvalidLicenseChanges(changes, {
    allow: ['BSD-3-Clause']
  })
  expect(forbidden).toStrictEqual([npmChange])
})

test('it adds all licenses to unresolved if it is unable to determine the validity', async () => {
  const changes: Changes = [
    {...npmChange, license: 'Foo'},
    {...rubyChange, license: 'Bar'}
  ]
  const invalidLicenses = await getInvalidLicenseChanges(changes, {
    allow: ['Apache-2.0']
  })
  expect(invalidLicenses.forbidden.length).toEqual(0)
  expect(invalidLicenses.unlicensed.length).toEqual(0)
  expect(invalidLicenses.unresolved.length).toEqual(2)
})

test('it does not filter out changes that are on the exclusions list', async () => {
  const changes: Changes = [pipChange, npmChange, rubyChange]
  const licensesConfig = {
    allow: ['BSD-3-Clause'],
    licenseExclusions: ['pkg:pypi/package-1@1.1.1', 'pkg:npm/reeuhq@1.0.2']
  }
  const invalidLicenses = await getInvalidLicenseChanges(
    changes,
    licensesConfig
  )
  expect(invalidLicenses.forbidden.length).toEqual(0)
})

test('it does not fail when the packages dont have a valid PURL', async () => {
  const emptyPurlChange = pipChange
  emptyPurlChange.package_url = ''

  const changes: Changes = [emptyPurlChange, npmChange, rubyChange]
  const licensesConfig = {
    allow: ['BSD-3-Clause'],
    licenseExclusions: ['pkg:pypi/package-1@1.1.1', 'pkg:npm/reeuhq@1.0.2']
  }

  const invalidLicenses = await getInvalidLicenseChanges(
    changes,
    licensesConfig
  )
  expect(invalidLicenses.forbidden.length).toEqual(1)
})

test('it does not filter out changes that are on the exclusions list with empty PURL fallback', async () => {
  const emptyPurlChange = {
    ...pipChange,
    package_url: '',
    source_repository_url: 'https://github.com/some-owner/some-repo'
  }

  const changes: Changes = [emptyPurlChange, npmChange, rubyChange]
  const licensesConfig = {
    allow: ['BSD-3-Clause'],
    licenseExclusions: [
      'pkg:npm/reeuhq@1.0.2',
      'pkg:github/some-owner/some-repo'
    ]
  }

  const invalidLicenses = await getInvalidLicenseChanges(
    changes,
    licensesConfig
  )
  expect(invalidLicenses.forbidden.length).toEqual(0)
})

test('it does filters out changes if they are not on the exclusions list', async () => {
  const changes: Changes = [pipChange, npmChange, rubyChange]
  const licensesConfig = {
    allow: ['BSD-3-Clause'],
    licenseExclusions: [
      'pkg:pypi/notmypackage-1@1.1.1',
      'pkg:npm/alsonot@1.0.2'
    ]
  }

  const invalidLicenses = await getInvalidLicenseChanges(
    changes,
    licensesConfig
  )

  expect(invalidLicenses.forbidden.length).toEqual(2)
  expect(invalidLicenses.forbidden[0]).toBe(pipChange)
  expect(invalidLicenses.forbidden[1]).toBe(npmChange)
})

describe('GH License API fallback', () => {
  test('it calls licenses endpoint if atleast one of the changes has null license and valid source_repository_url', async () => {
    const nullLicenseChange = {
      ...npmChange,
      license: null,
      source_repository_url: 'http://github.com/some-owner/some-repo'
    }
    const {unlicensed} = await getInvalidLicenseChanges(
      [nullLicenseChange, rubyChange],
      {}
    )

    expect(mockOctokit.rest.licenses.getForRepo).toHaveBeenNthCalledWith(1, {
      owner: 'some-owner',
      repo: 'some-repo'
    })
    expect(unlicensed.length).toEqual(0)
  })

  test('it does not call licenses API endpoint for change with null license and invalid source_repository_url ', async () => {
    const {unlicensed} = await getInvalidLicenseChanges(
      [{...npmChange, license: null}],
      {}
    )
    expect(mockOctokit.rest.licenses.getForRepo).not.toHaveBeenCalled()
    expect(unlicensed.length).toEqual(1)
  })

  test('it does not call licenses API endpoint if licenses for all changes are present', async () => {
    const {unlicensed} = await getInvalidLicenseChanges(
      [npmChange, rubyChange],
      {}
    )

    expect(mockOctokit.rest.licenses.getForRepo).not.toHaveBeenCalled()
    expect(unlicensed.length).toEqual(0)
  })
})

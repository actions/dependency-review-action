import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'

let getDeniedChanges: Function

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

const mvnChange: Change = {
  change_type: 'added',
  manifest: 'pom.xml',
  ecosystem: 'maven',
  name: 'org.apache.logging.log4j:log4j-core',
  version: '2.15.0',
  package_url: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.7',
  license: 'Apache-2.0',
  source_repository_url:
    'https://mvnrepository.com/artifact/org.apache.logging.log4j/log4j-core',
  scope: 'unknown',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'second-random_string',
      advisory_summary: 'not so dangerous',
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
  jest.doMock('spdx-satisfies', () => {
    // mock spdx-satisfies return value
    // true for BSD, false for all others
    return jest.fn((license: string, _: string): boolean => license === 'BSD')
  })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ;({getDeniedChanges} = require('../src/deny'))
})

test('it adds packages in the deny packages list', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    ['pkg:gem/actionsomething@3.2.0'],
    []
  )

  expect(deniedChanges[0]).toBe(rubyChange)
  expect(deniedChanges.length).toEqual(1)
})

test('it adds packages in the deny group list', async () => {
  const changes: Changes = [mvnChange, rubyChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    [],
    ['pkg:maven/org.apache.logging.log4j']
  )

  expect(deniedChanges[0]).toBe(mvnChange)
  expect(deniedChanges.length).toEqual(1)
})

test('it adds packages outside of the deny lists', async () => {
  const changes: Changes = [npmChange, pipChange]
  const deniedChanges = await getDeniedChanges(
    changes,
    ['pkg:gem/actionsomething'],
    ['pkg:maven:org.apache.logging.log4j']
  )

  expect(deniedChanges.length).toEqual(0)
})

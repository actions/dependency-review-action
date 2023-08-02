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
  package_url: 'pkg:pip/package-1@1.1.1',
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
  jest.doMock('spdx-satisfies', () => {
    // mock spdx-satisfies return value
    // true for BSD, false for all others
    return jest.fn((license: string, _: string): boolean => license === 'BSD')
  })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ;({getDeniedChanges} = require('../src/denylist'))
})

test('it adds license outside the allow list to forbidden changes', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const deniedChanges = await getDeniedChanges(changes, ['actionsomething'])

  expect(deniedChanges[0]).toBe(rubyChange)
  expect(deniedChanges.length).toEqual(1)
})

import {expect, test} from '@jest/globals'
import {Change} from '../src/schemas'
import {
  filterChangesBySeverity,
  filterChangesByScopes,
  filterAllowedAdvisories
} from '../src/filter'

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
  scope: 'development',
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

const noVulnNpmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'helpful',
  version: '1.0.0',
  package_url: 'pkg:npm/helpful@1.0.0',
  license: 'MIT',
  source_repository_url: 'github.com/some-repo',
  scope: 'runtime',
  vulnerabilities: []
}

test('it properly filters changes by severity', async () => {
  const changes = [npmChange, rubyChange]
  let result = filterChangesBySeverity('high', changes)
  expect(result).toEqual([npmChange])

  result = filterChangesBySeverity('low', changes)
  expect(changes).toEqual([npmChange, rubyChange])

  result = filterChangesBySeverity('critical', changes)
  expect(changes).toEqual([npmChange, rubyChange])
})

test('it properly filters changes by scope', async () => {
  const changes = [npmChange, rubyChange]

  let result = filterChangesByScopes(['runtime'], changes)
  expect(result).toEqual([npmChange])

  result = filterChangesByScopes(['development'], changes)
  expect(result).toEqual([rubyChange])

  result = filterChangesByScopes(['runtime', 'development'], changes)
  expect(result).toEqual([npmChange, rubyChange])
})

test('it properly handles undefined advisory IDs', async () => {
  const changes = [npmChange, rubyChange, noVulnNpmChange]
  const result = filterAllowedAdvisories(undefined, changes)
  expect(result).toEqual([npmChange, rubyChange, noVulnNpmChange])
})

test('it properly filters changes with allowed vulnerabilities', async () => {
  const changes = [npmChange, rubyChange, noVulnNpmChange]

  let result = filterAllowedAdvisories(['notrealGHSAID'], changes)
  expect(result).toEqual([npmChange, rubyChange, noVulnNpmChange])

  result = filterAllowedAdvisories(['first-random_string'], changes)
  expect(result).toEqual([rubyChange, noVulnNpmChange])

  result = filterAllowedAdvisories(
    ['second-random_string', 'third-random_string'],
    changes
  )
  expect(result).toEqual([npmChange, noVulnNpmChange])

  result = filterAllowedAdvisories(
    ['first-random_string', 'second-random_string', 'third-random_string'],
    changes
  )
  expect(result).toEqual([noVulnNpmChange])

  // if we have a change with multiple vulnerabilities but only one is allowed, we still should not filter out that change
  result = filterAllowedAdvisories(['second-random_string'], changes)
  expect(result).toEqual([npmChange, rubyChange, noVulnNpmChange])
})

test('it properly filters by severity and also allowed vulnerabilities', async () => {
  const changes = [rubyChange]

  // filter by severity first then by allowed advisory
  let tempResult = filterChangesBySeverity('moderate', changes)
  let result = filterAllowedAdvisories(['second-random_string'], tempResult)
  expect(result).toEqual([])

  //filter by allowed advisory first then by severity (yields different output)
  tempResult = filterAllowedAdvisories(['second-random_string'], changes)
  result = filterChangesBySeverity('moderate', tempResult)
  expect(result).not.toEqual([])
})

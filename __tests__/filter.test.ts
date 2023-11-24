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
      advisory_ghsa_id: 'vulnerable-ghsa-id',
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
      advisory_ghsa_id: 'moderate-ghsa-id',
      advisory_summary: 'not so dangerous',
      advisory_url: 'github.com/future-funk'
    },
    {
      severity: 'low',
      advisory_ghsa_id: 'low-ghsa-id',
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

const lodashChange: Change = {
  change_type: 'added',
  manifest: 'package.json',
  ecosystem: 'npm',
  name: 'lodash',
  version: '4.17.0',
  package_url: 'pkg:npm/lodash@4.17.0',
  license: 'MIT',
  source_repository_url: 'https://github.com/lodash/lodash',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'GHSA-jf85-cpcp-j695',
      advisory_summary: 'Prototype Pollution in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-jf85-cpcp-j695'
    },
    {
      severity: 'high',
      advisory_ghsa_id: 'GHSA-4xc9-xhrj-v574',
      advisory_summary: 'Prototype Pollution in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-4xc9-xhrj-v574'
    },
    {
      severity: 'high',
      advisory_ghsa_id: 'GHSA-35jh-r3h4-6jhm',
      advisory_summary: 'Command Injection in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm'
    },
    {
      severity: 'high',
      advisory_ghsa_id: 'GHSA-p6mc-m468-83gw',
      advisory_summary: 'Prototype Pollution in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw'
    },
    {
      severity: 'moderate',
      advisory_ghsa_id: 'GHSA-x5rq-j2xg-h7qm',
      advisory_summary:
        'Regular Expression Denial of Service (ReDoS) in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-x5rq-j2xg-h7qm'
    },
    {
      severity: 'moderate',
      advisory_ghsa_id: 'GHSA-29mw-wpgm-hmr9',
      advisory_summary:
        'Regular Expression Denial of Service (ReDoS) in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-29mw-wpgm-hmr9'
    },
    {
      severity: 'low',
      advisory_ghsa_id: 'GHSA-fvqr-27wr-82fm',
      advisory_summary: 'Prototype Pollution in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-fvqr-27wr-82fm'
    }
  ]
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

  const fakeGHSAChanges = filterAllowedAdvisories(['notrealGHSAID'], changes)
  expect(fakeGHSAChanges).toEqual([npmChange, rubyChange, noVulnNpmChange])
})

test('it properly filters only allowed vulnerabilities', async () => {
  const changes = [npmChange, rubyChange, noVulnNpmChange]
  const oldVulns = [
    ...npmChange.vulnerabilities,
    ...rubyChange.vulnerabilities,
    ...noVulnNpmChange.vulnerabilities
  ]

  const vulnerable = filterAllowedAdvisories(['vulnerable-ghsa-id'], changes)

  const newVulns = vulnerable.map(change => change.vulnerabilities).flat()

  expect(newVulns.length).toEqual(oldVulns.length - 1)
  expect(newVulns).not.toContainEqual(
    expect.objectContaining({advisory_ghsa_id: 'vulnerable-ghsa-id'})
  )
})

test('does not drop dependencies when filtering by GHSA', async () => {
  const changes = [npmChange, rubyChange, noVulnNpmChange]
  const result = filterAllowedAdvisories(
    ['moderate-ghsa-id', 'low-ghsa-id', 'GHSA-jf85-cpcp-j695'],
    changes
  )

  expect(result.map(change => change.name)).toEqual(
    changes.map(change => change.name)
  )
})

test('it properly filters multiple GHSAs', async () => {
  const allowedGHSAs = ['vulnerable-ghsa-id', 'moderate-ghsa-id', 'low-ghsa-id']
  const changes = [npmChange, rubyChange, noVulnNpmChange]
  const oldVulns = changes.map(change => change.vulnerabilities).flat()

  const result = filterAllowedAdvisories(allowedGHSAs, changes)

  const newVulns = result.map(change => change.vulnerabilities).flat()

  expect(newVulns.length).toEqual(oldVulns.length - 3)
})

test('it properly filters multiple GHSAs', async () => {
  const lodash = filterAllowedAdvisories(
    ['GHSA-jf85-cpcp-j695'],
    [lodashChange]
  )[0]
  // the filter should have removed a single GHSA from the list
  const expected = lodashChange.vulnerabilities.filter(
    vuln => vuln.advisory_ghsa_id !== 'GHSA-jf85-cpcp-j695'
  )
  expect(expected.length).toEqual(lodashChange.vulnerabilities.length - 1)
  expect(lodash.vulnerabilities).toEqual(expected)
})

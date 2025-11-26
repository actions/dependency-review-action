import {test, expect} from '@jest/globals'
import {getResolvedVulnerabilities} from '../src/resolved-vulnerabilities'
import {Changes, Change} from '../src/schemas'

const vulnerableRemovedChange: Change = {
  change_type: 'removed',
  manifest: 'package.json',
  ecosystem: 'npm',
  name: 'lodash',
  version: '4.17.20',
  package_url: 'pkg:npm/lodash@4.17.20',
  license: 'MIT',
  source_repository_url: 'https://github.com/lodash/lodash',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'high',
      advisory_ghsa_id: 'GHSA-35jh-r3h4-6jhm',
      advisory_summary: 'lodash Prototype Pollution vulnerability',
      advisory_url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm'
    },
    {
      severity: 'critical',
      advisory_ghsa_id: 'GHSA-p6mc-m468-83gw',
      advisory_summary: 'lodash Command Injection via template',
      advisory_url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw'
    }
  ]
}

const nonVulnerableRemovedChange: Change = {
  change_type: 'removed',
  manifest: 'package.json',
  ecosystem: 'npm',
  name: 'express',
  version: '4.18.0',
  package_url: 'pkg:npm/express@4.18.0',
  license: 'MIT',
  source_repository_url: 'https://github.com/expressjs/express',
  scope: 'runtime',
  vulnerabilities: []
}

const addedChange: Change = {
  change_type: 'added',
  manifest: 'package.json',
  ecosystem: 'npm',
  name: 'react',
  version: '18.0.0',
  package_url: 'pkg:npm/react@18.0.0',
  license: 'MIT',
  source_repository_url: 'https://github.com/facebook/react',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'moderate',
      advisory_ghsa_id: 'GHSA-test-1234',
      advisory_summary: 'Test vulnerability',
      advisory_url: 'https://github.com/advisories/GHSA-test-1234'
    }
  ]
}

test('extracts resolved vulnerabilities from removed packages', () => {
  const changes: Changes = [
    vulnerableRemovedChange,
    nonVulnerableRemovedChange,
    addedChange
  ]

  const resolvedVulns = getResolvedVulnerabilities(changes)

  expect(resolvedVulns).toHaveLength(2)
  
  expect(resolvedVulns[0]).toEqual({
    severity: 'high',
    advisory_ghsa_id: 'GHSA-35jh-r3h4-6jhm',
    advisory_summary: 'lodash Prototype Pollution vulnerability',
    advisory_url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm',
    package_name: 'lodash',
    package_version: '4.17.20',
    package_url: 'pkg:npm/lodash@4.17.20',
    manifest: 'package.json',
    ecosystem: 'npm'
  })

  expect(resolvedVulns[1]).toEqual({
    severity: 'critical',
    advisory_ghsa_id: 'GHSA-p6mc-m468-83gw',
    advisory_summary: 'lodash Command Injection via template',
    advisory_url: 'https://github.com/advisories/GHSA-p6mc-m468-83gw',
    package_name: 'lodash',
    package_version: '4.17.20',
    package_url: 'pkg:npm/lodash@4.17.20',
    manifest: 'package.json',
    ecosystem: 'npm'
  })
})

test('returns empty array when no removed packages have vulnerabilities', () => {
  const changes: Changes = [nonVulnerableRemovedChange, addedChange]
  
  const resolvedVulns = getResolvedVulnerabilities(changes)
  
  expect(resolvedVulns).toHaveLength(0)
})

test('ignores added packages with vulnerabilities', () => {
  const changes: Changes = [addedChange]
  
  const resolvedVulns = getResolvedVulnerabilities(changes)
  
  expect(resolvedVulns).toHaveLength(0)
})

test('handles empty changes array', () => {
  const changes: Changes = []
  
  const resolvedVulns = getResolvedVulnerabilities(changes)
  
  expect(resolvedVulns).toHaveLength(0)
})
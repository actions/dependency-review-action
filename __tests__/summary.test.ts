import {expect, jest, test} from '@jest/globals'
import {Changes, ConfigurationOptions} from '../src/schemas'
import * as summary from '../src/summary'
import * as core from '@actions/core'
import {createTestChange} from './fixtures/create-test-change'
import {createTestVulnerability} from './fixtures/create-test-vulnerability'

afterEach(() => {
  jest.clearAllMocks()
  core.summary.emptyBuffer()
})

const emptyChanges: Changes = []
const emptyInvalidLicenseChanges = {
  forbidden: [],
  unresolved: [],
  unlicensed: []
}
const defaultConfig: ConfigurationOptions = {
  vulnerability_check: true,
  license_check: true,
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  include_dependency_snapshots: false,
  allow_ghsas: [],
  allow_licenses: [],
  deny_licenses: [],
  comment_summary_in_pr: true
}

test('prints headline as h1', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).toContain('<h1>Dependency Review</h1>')
})

test('only includes "No vulnerabilities or license issues found"-message if both are configured and nothing was found', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).toContain('✅ No vulnerabilities or license issues found.')
})

test('only includes "No vulnerabilities found"-message if "license_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, license_check: false}
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, config)
  const text = core.summary.stringify()

  expect(text).toContain('✅ No vulnerabilities found.')
})

test('only includes "No license issues found"-message if "vulnerability_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, vulnerability_check: false}
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, config)
  const text = core.summary.stringify()

  expect(text).toContain('✅ No license issues found.')
})

test('does not include status section if nothing was found', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).not.toContain('The following issues were found:')
})

test('includes count and status icons for all findings', () => {
  const vulnerabilities = [
    createTestChange({name: 'lodash'}),
    createTestChange({name: 'underscore', package_url: 'test-url'})
  ]
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [createTestChange(), createTestChange()],
    unlicensed: [createTestChange(), createTestChange(), createTestChange()]
  }

  summary.addSummaryToSummary(vulnerabilities, licenseIssues, defaultConfig)

  const text = core.summary.stringify()
  expect(text).toContain('❌ 2 vulnerable package(s)')
  expect(text).toContain(
    '❌ 2 package(s) with invalid SPDX license definitions'
  )
  expect(text).toContain('❌ 1 package(s) with incompatible licenses')
  expect(text).toContain('⚠️ 3 package(s) with unknown licenses')
})

test('uses checkmarks for license issues if only vulnerabilities were found', () => {
  const vulnerabilities = [createTestChange()]

  summary.addSummaryToSummary(
    vulnerabilities,
    emptyInvalidLicenseChanges,
    defaultConfig
  )

  const text = core.summary.stringify()
  expect(text).toContain('❌ 1 vulnerable package(s)')
  expect(text).toContain(
    '✅ 0 package(s) with invalid SPDX license definitions'
  )
  expect(text).toContain('✅ 0 package(s) with incompatible licenses')
  expect(text).toContain('✅ 0 package(s) with unknown licenses')
})

test('uses checkmarks for vulnerabilities if only license issues were found', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [],
    unlicensed: []
  }

  summary.addSummaryToSummary(emptyChanges, licenseIssues, defaultConfig)

  const text = core.summary.stringify()
  expect(text).toContain('✅ 0 vulnerable package(s)')
  expect(text).toContain(
    '✅ 0 package(s) with invalid SPDX license definitions'
  )
  expect(text).toContain('❌ 1 package(s) with incompatible licenses')
  expect(text).toContain('✅ 0 package(s) with unknown licenses')
})

test('addChangeVulnerabilitiesToSummary() - only includes section if any vulnerabilites found', () => {
  summary.addChangeVulnerabilitiesToSummary(emptyChanges, 'low')
  const text = core.summary.stringify()
  expect(text).toEqual('')
})

test('addChangeVulnerabilitiesToSummary() - includes all vulnerabilities', () => {
  const changes = [
    createTestChange({name: 'lodash'}),
    createTestChange({name: 'underscore', package_url: 'test-url'})
  ]

  summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).toContain('<h2>Vulnerabilities</h2>')
  expect(text).toContain('lodash')
  expect(text).toContain('underscore')
})

test('addChangeVulnerabilitiesToSummary() - includes advisory url if available', () => {
  const changes = [
    createTestChange({
      name: 'underscore',
      vulnerabilities: [
        createTestVulnerability({
          advisory_summary: 'test-summary',
          advisory_url: 'test-url'
        })
      ]
    })
  ]

  summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).toContain('lodash')
  expect(text).toContain('<a href="test-url">test-summary</a>')
})

test('addChangeVulnerabilitiesToSummary() - groups vulnerabilities of a single package', () => {
  const changes = [
    createTestChange({
      name: 'package-with-multiple-vulnerabilities',
      vulnerabilities: [
        createTestVulnerability({advisory_summary: 'test-summary-1'}),
        createTestVulnerability({advisory_summary: 'test-summary-2'})
      ]
    })
  ]

  summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text.match('package-with-multiple-vulnerabilities')).toHaveLength(1)
  expect(text).toContain('test-summary-1')
  expect(text).toContain('test-summary-2')
})

test('addChangeVulnerabilitiesToSummary() - prints severity statement if above low', () => {
  const changes = [createTestChange()]

  summary.addChangeVulnerabilitiesToSummary(changes, 'medium')

  const text = core.summary.stringify()
  expect(text).toContain(
    'Only included vulnerabilities with severity <strong>medium</strong> or higher.'
  )
})

test('addChangeVulnerabilitiesToSummary() - does not print severity statment if it is set to "low"', () => {
  const changes = [createTestChange()]

  summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).not.toContain('Only included vulnerabilities')
})

test('addLicensesToSummary() - does not include entire section if no license issues found', () => {
  summary.addLicensesToSummary(emptyInvalidLicenseChanges, defaultConfig)
  const text = core.summary.stringify()
  expect(text).toEqual('')
})

test('addLicensesToSummary() - includes all license issues in table', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [createTestChange(), createTestChange()],
    unlicensed: [createTestChange(), createTestChange(), createTestChange()]
  }

  summary.addLicensesToSummary(licenseIssues, defaultConfig)

  const text = core.summary.stringify()
  expect(text).toContain('<h2>License Issues</h2>')
  expect(text).toContain('<td>Incompatible License</td>')
  expect(text).toContain('<td>Invalid SPDX License</td>')
  expect(text).toContain('<td>Unknown License</td>')
})

test('addLicenseToSummary() - adds one table per manifest', () => {
  const licenseIssues = {
    forbidden: [
      createTestChange({manifest: 'package.json'}),
      createTestChange({manifest: '.github/workflows/test.yml'})
    ],
    unresolved: [],
    unlicensed: []
  }

  summary.addLicensesToSummary(licenseIssues, defaultConfig)

  const text = core.summary.stringify()

  expect(text).toContain('<h4><em>package.json</em></h4>')
  expect(text).toContain('<h4><em>.github/workflows/test.yml</em></h4>')
})

test('addLicensesToSummary() - does not include specific license type sub-section if nothing is found', () => {
  const licenseIssues = {
    forbidden: [],
    unlicensed: [],
    unresolved: [createTestChange()]
  }

  summary.addLicensesToSummary(licenseIssues, defaultConfig)

  const text = core.summary.stringify()
  expect(text).not.toContain('<td>Incompatible License</td>')
  expect(text).not.toContain('<td>Unknown License</td>')
  expect(text).toContain('<td>Invalid SPDX License</td>')
})

test('addLicensesToSummary() - includes list of configured allowed licenses', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [],
    unlicensed: []
  }

  const config: ConfigurationOptions = {
    ...defaultConfig,
    allow_licenses: ['MIT', 'Apache-2.0']
  }

  summary.addLicensesToSummary(licenseIssues, config)

  const text = core.summary.stringify()
  expect(text).toContain('<strong>Allowed Licenses</strong>: MIT, Apache-2.0')
})

test('addLicensesToSummary() - includes configured denied license', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [],
    unlicensed: []
  }

  const config: ConfigurationOptions = {
    ...defaultConfig,
    deny_licenses: ['MIT']
  }

  summary.addLicensesToSummary(licenseIssues, config)

  const text = core.summary.stringify()
  expect(text).toContain('<strong>Denied Licenses</strong>: MIT')
})

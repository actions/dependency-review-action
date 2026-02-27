import {expect, jest, test, beforeEach} from '@jest/globals'
import {Changes, ConfigurationOptions, Scorecard} from '../src/schemas'
import * as summary from '../src/summary'
import * as core from '@actions/core'
import {createTestChange} from './fixtures/create-test-change'
import {createTestVulnerability} from './fixtures/create-test-vulnerability'
import * as utils from '../src/utils'

const mockOctokitRequest = jest.fn<any>()

beforeEach(() => {
  jest.spyOn(utils, 'octokitClient').mockReturnValue({
    request: mockOctokitRequest
  } as any)

  mockOctokitRequest.mockResolvedValue({
    data: {vulnerabilities: []}
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  core.summary.emptyBuffer()
})

const emptyChanges: Changes = []
const emptyInvalidLicenseChanges = {
  forbidden: [],
  unresolved: [],
  unlicensed: []
}
const emptyScorecard: Scorecard = {
  dependencies: []
}
const defaultConfig: ConfigurationOptions = {
  vulnerability_check: true,
  license_check: true,
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  allow_ghsas: [],
  allow_licenses: [],
  deny_licenses: [],
  deny_packages: [],
  deny_groups: [],
  comment_summary_in_pr: true,
  retry_on_snapshot_warnings: false,
  retry_on_snapshot_warnings_timeout: 120,
  warn_only: false,
  warn_on_openssf_scorecard_level: 3,
  show_openssf_scorecard: false,
  show_patched_versions: false
}

const changesWithEmptyManifests: Changes = [
  {
    change_type: 'added',
    manifest: '',
    ecosystem: 'unknown',
    name: 'castore',
    version: '0.1.17',
    package_url: 'pkg:hex/castore@0.1.17',
    license: null,
    source_repository_url: null,
    scope: 'runtime',
    vulnerabilities: []
  },
  {
    change_type: 'added',
    manifest: '',
    ecosystem: 'unknown',
    name: 'connection',
    version: '1.1.0',
    package_url: 'pkg:hex/connection@1.1.0',
    license: null,
    source_repository_url: null,
    scope: 'runtime',
    vulnerabilities: []
  },
  {
    change_type: 'added',
    manifest: 'python/dist-info/METADATA',
    ecosystem: 'pip',
    name: 'pygments',
    version: '2.6.1',
    package_url: 'pkg:pypi/pygments@2.6.1',
    license: 'BSD-2-Clause',
    source_repository_url: 'https://github.com/pygments/pygments',
    scope: 'runtime',
    vulnerabilities: []
  }
]

const scorecard: Scorecard = {
  dependencies: [
    {
      change: {
        change_type: 'added',
        manifest: '',
        ecosystem: 'unknown',
        name: 'castore',
        version: '0.1.17',
        package_url: 'pkg:hex/castore@0.1.17',
        license: null,
        source_repository_url: null,
        scope: 'runtime',
        vulnerabilities: []
      },
      scorecard: null
    }
  ]
}

test('prints headline as h1', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    scorecard,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).toContain('<h1>Dependency Review</h1>')
})

test('does not add deprecation warning for deny-licenses option if not set', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    scorecard,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).not.toContain('deny-licenses')
})

test('adds deprecation warning for deny-licenses option if set', () => {
  const config = {...defaultConfig, deny_licenses: ['MIT']}

  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    scorecard,
    config
  )
  const text = core.summary.stringify()

  expect(text).toContain('deny-licenses')
})

test('returns minimal summary formatted for posting as a PR comment', () => {
  const OLD_ENV = process.env

  const changes: Changes = [
    createTestChange({name: 'lodash', version: '1.2.3'}),
    createTestChange({name: 'colors', version: '2.3.4'}),
    createTestChange({name: '@foo/bar', version: '*'})
  ]

  process.env.GITHUB_SERVER_URL = 'https://github.com'
  process.env.GITHUB_REPOSITORY = 'owner/repo'
  process.env.GITHUB_RUN_ID = 'abc-123-xyz'

  const minSummary: string = summary.addSummaryToSummary(
    changes,
    emptyInvalidLicenseChanges,
    emptyChanges,
    scorecard,
    defaultConfig
  )

  process.env = OLD_ENV

  // note: no Actions context values in unit test env
  const expected = `
# Dependency Review
The following issues were found:
* ❌ 3 vulnerable package(s)
* ✅ 0 package(s) with incompatible licenses
* ✅ 0 package(s) with invalid SPDX license definitions
* ✅ 0 package(s) with unknown licenses.

[View full job summary](https://github.com/owner/repo/actions/runs/abc-123-xyz)
  `.trim()

  expect(minSummary).toEqual(expected)
})

test('only includes "No vulnerabilities or license issues found"-message if both are configured and nothing was found', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    emptyScorecard,
    defaultConfig
  )
  const text = core.summary.stringify()

  expect(text).toContain('✅ No vulnerabilities or license issues found.')
})

test('only includes "No vulnerabilities found"-message if "license_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, license_check: false}
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    emptyScorecard,
    config
  )
  const text = core.summary.stringify()

  expect(text).toContain('✅ No vulnerabilities found.')
})

test('only includes "No license issues found"-message if "vulnerability_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, vulnerability_check: false}
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    emptyScorecard,
    config
  )
  const text = core.summary.stringify()

  expect(text).toContain('✅ No license issues found.')
})

test('groups dependencies with empty manifest paths together', () => {
  summary.addSummaryToSummary(
    changesWithEmptyManifests,
    emptyInvalidLicenseChanges,
    emptyChanges,
    emptyScorecard,
    defaultConfig
  )
  summary.addScannedFiles(changesWithEmptyManifests)
  const text = core.summary.stringify()
  expect(text).toContain('Unnamed Manifest')
  expect(text).toContain('python/dist-info/METADATA')
})

test('does not include status section if nothing was found', () => {
  summary.addSummaryToSummary(
    emptyChanges,
    emptyInvalidLicenseChanges,
    emptyChanges,
    emptyScorecard,
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

  summary.addSummaryToSummary(
    vulnerabilities,
    licenseIssues,
    emptyChanges,
    emptyScorecard,
    defaultConfig
  )

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
    emptyChanges,
    emptyScorecard,
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

  summary.addSummaryToSummary(
    emptyChanges,
    licenseIssues,
    emptyChanges,
    emptyScorecard,
    defaultConfig
  )

  const text = core.summary.stringify()
  expect(text).toContain('✅ 0 vulnerable package(s)')
  expect(text).toContain(
    '✅ 0 package(s) with invalid SPDX license definitions'
  )
  expect(text).toContain('❌ 1 package(s) with incompatible licenses')
  expect(text).toContain('✅ 0 package(s) with unknown licenses')
})

test('addChangeVulnerabilitiesToSummary() - only includes section if any vulnerabilities found', async () => {
  await summary.addChangeVulnerabilitiesToSummary(emptyChanges, 'low')
  const text = core.summary.stringify()
  expect(text).toEqual('')
})

test('addChangeVulnerabilitiesToSummary() - includes all vulnerabilities', async () => {
  const changes = [
    createTestChange({name: 'lodash'}),
    createTestChange({name: 'underscore', package_url: 'test-url'})
  ]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).toContain('<h2>Vulnerabilities</h2>')
  expect(text).toContain('lodash')
  expect(text).toContain('underscore')
})

test('addChangeVulnerabilitiesToSummary() - includes advisory url if available', async () => {
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

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).toContain('lodash')
  expect(text).toContain('<a href="test-url">test-summary</a>')
})

test('addChangeVulnerabilitiesToSummary() - groups vulnerabilities of a single package', async () => {
  const changes = [
    createTestChange({
      name: 'package-with-multiple-vulnerabilities',
      vulnerabilities: [
        createTestVulnerability({advisory_summary: 'test-summary-1'}),
        createTestVulnerability({advisory_summary: 'test-summary-2'})
      ]
    })
  ]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text.match('package-with-multiple-vulnerabilities')).toHaveLength(1)
  expect(text).toContain('test-summary-1')
  expect(text).toContain('test-summary-2')
})

test('addChangeVulnerabilitiesToSummary() - prints severity statement if above low', async () => {
  const changes = [createTestChange()]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'medium')

  const text = core.summary.stringify()
  expect(text).toContain(
    'Only included vulnerabilities with severity <strong>medium</strong> or higher.'
  )
})

test('addChangeVulnerabilitiesToSummary() - does not print severity statement if it is set to "low"', async () => {
  const changes = [createTestChange()]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).not.toContain('Only included vulnerabilities')
})

test('addChangeVulnerabilitiesToSummary() - does not include patched version column by default', async () => {
  const changes = [createTestChange()]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).not.toContain('Patched Version')
})

test('addChangeVulnerabilitiesToSummary() - includes patched version column when enabled', async () => {
  const changes = [createTestChange()]

  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()
  expect(text).toContain('Patched Version')
})

test('addChangeVulnerabilitiesToSummary() - skips patched version on GHES even when enabled', async () => {
  const originalUrl = process.env.GITHUB_SERVER_URL
  process.env.GITHUB_SERVER_URL = 'https://ghes.example.com'
  const warnSpy = jest.spyOn(core, 'warning')

  const changes = [createTestChange()]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()
  expect(text).not.toContain('Patched Version')
  expect(warnSpy).toHaveBeenCalledWith(
    'show-patched-versions is not supported on GitHub Enterprise Server. The Patched Version column will be omitted.'
  )
  expect(mockOctokitRequest).not.toHaveBeenCalled()

  process.env.GITHUB_SERVER_URL = originalUrl
})

test('addChangeVulnerabilitiesToSummary() - works normally on GHES when patched versions disabled', async () => {
  const originalUrl = process.env.GITHUB_SERVER_URL
  process.env.GITHUB_SERVER_URL = 'https://ghes.example.com'

  const changes = [createTestChange()]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', false)

  const text = core.summary.stringify()
  expect(text).not.toContain('Patched Version')
  expect(mockOctokitRequest).not.toHaveBeenCalled()

  process.env.GITHUB_SERVER_URL = originalUrl
})

test('addChangeVulnerabilitiesToSummary() - works normally on GHES with default (no third arg)', async () => {
  const originalUrl = process.env.GITHUB_SERVER_URL
  process.env.GITHUB_SERVER_URL = 'https://ghes.example.com'

  const changes = [createTestChange()]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low')

  const text = core.summary.stringify()
  expect(text).not.toContain('Patched Version')
  expect(mockOctokitRequest).not.toHaveBeenCalled()

  process.env.GITHUB_SERVER_URL = originalUrl
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
  expect(text).toContain(
    '<details><summary><strong>Allowed Licenses</strong>:</summary> MIT, Apache-2.0</details>'
  )
})

test('addLicensesToSummary() - includes configured denied license', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [],
    unlicensed: []
  }

  const config: ConfigurationOptions = {
    ...defaultConfig,
    deny_licenses: ['MIT', 'Apache-2.0']
  }

  summary.addLicensesToSummary(licenseIssues, config)

  const text = core.summary.stringify()
  expect(text).toContain(
    '<details><summary><strong>Denied Licenses</strong>:</summary> MIT, Apache-2.0</details>'
  )
})

test('addLicensesToSummary() - includes allowed dependency licences', () => {
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [],
    unlicensed: []
  }

  const config: ConfigurationOptions = {
    ...defaultConfig,
    allow_dependencies_licenses: ['MIT', 'Apache-2.0']
  }

  summary.addLicensesToSummary(licenseIssues, config)

  const text = core.summary.stringify()
  expect(text).toContain(
    '<details><summary><strong>Excluded from license check</strong>:</summary> MIT, Apache-2.0</details>'
  )
})

test('addChangeVulnerabilitiesToSummary() - handles multiple version ranges for same package', async () => {
  // Simulates GHSA-gwq6-fmvp-qp68 scenario with multiple version ranges
  const pkg8 = createTestChange({
    ecosystem: 'nuget',
    name: 'Microsoft.NetCore.App.Runtime.linux-arm',
    version: '8.0.1',
    vulnerabilities: [
      createTestVulnerability({
        advisory_ghsa_id: 'GHSA-test-multi',
        advisory_summary: 'Test Multi-Range Advisory',
        severity: 'high'
      })
    ]
  })

  const pkg9 = createTestChange({
    ecosystem: 'nuget',
    name: 'Microsoft.NetCore.App.Runtime.linux-arm',
    version: '9.0.1',
    vulnerabilities: [
      createTestVulnerability({
        advisory_ghsa_id: 'GHSA-test-multi',
        advisory_summary: 'Test Multi-Range Advisory',
        severity: 'high'
      })
    ]
  })

  // Mock API response with multiple version ranges for same package
  mockOctokitRequest.mockResolvedValueOnce({
    data: {
      vulnerabilities: [
        {
          package: {
            ecosystem: 'NuGet',
            name: 'Microsoft.NetCore.App.Runtime.linux-arm'
          },
          vulnerable_version_range: '>= 8.0.0, <= 8.0.20',
          first_patched_version: '8.0.21'
        },
        {
          package: {
            ecosystem: 'NuGet',
            name: 'Microsoft.NetCore.App.Runtime.linux-arm'
          },
          vulnerable_version_range: '>= 9.0.0, <= 9.0.9',
          first_patched_version: '9.0.10'
        }
      ]
    }
  })

  const changes = [pkg8, pkg9]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()

  // Both packages should have correct patched versions based on their version ranges
  expect(text).toContain('8.0.21')
  expect(text).toContain('9.0.10')
  expect(mockOctokitRequest).toHaveBeenCalledWith('GET /advisories/{ghsa_id}', {
    ghsa_id: 'GHSA-test-multi'
  })
})

test('addChangeVulnerabilitiesToSummary() - handles RestSharp GHSA-4rr6-2v9v-wcpc case', async () => {
  const pkg = createTestChange({
    ecosystem: 'nuget',
    name: 'RestSharp',
    version: '111.4.1',
    vulnerabilities: [
      createTestVulnerability({
        advisory_ghsa_id: 'GHSA-4rr6-2v9v-wcpc',
        advisory_summary:
          "CRLF Injection in RestSharp's `RestRequest.AddHeader` method",
        severity: 'moderate'
      })
    ]
  })

  // Mock API response matching actual GitHub Advisory Database response
  mockOctokitRequest.mockResolvedValueOnce({
    data: {
      vulnerabilities: [
        {
          package: {
            ecosystem: 'nuget',
            name: 'RestSharp'
          },
          vulnerable_version_range: '>= 107.0.0-preview.1, < 112.0.0',
          first_patched_version: '112.0.0'
        }
      ]
    }
  })

  const changes = [pkg]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()

  // Should show the correct patched version
  expect(text).toContain('112.0.0')
  expect(text).not.toContain('N/A')
  expect(mockOctokitRequest).toHaveBeenCalledWith('GET /advisories/{ghsa_id}', {
    ghsa_id: 'GHSA-4rr6-2v9v-wcpc'
  })
})

test('addChangeVulnerabilitiesToSummary() - handles version coercion for non-strict semver versions', async () => {
  // Test that versions like "8.0" (without patch version) can be coerced to "8.0.0"
  // for successful range matching in fail-open mode (patch selection)
  const pkg = createTestChange({
    ecosystem: 'npm',
    name: 'test-package',
    version: '8.0', // Non-strict semver version
    vulnerabilities: [
      createTestVulnerability({
        advisory_ghsa_id: 'GHSA-test-1234',
        advisory_summary: 'Test vulnerability',
        severity: 'high'
      })
    ]
  })

  mockOctokitRequest.mockResolvedValueOnce({
    data: {
      vulnerabilities: [
        {
          package: {
            ecosystem: 'npm',
            name: 'test-package'
          },
          vulnerable_version_range: '>= 8.0.0, < 9.0.0',
          first_patched_version: '9.0.0'
        }
      ]
    }
  })

  const changes = [pkg]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()

  // Should coerce "8.0" to "8.0.0" and successfully match the range,
  // showing the patched version instead of N/A
  expect(text).toContain('9.0.0')
  expect(text).not.toContain('N/A')
})

test('addChangeVulnerabilitiesToSummary() - handles invalid versions in fail-open mode', async () => {
  // Test that completely invalid versions that can't be coerced
  // still return N/A gracefully in fail-open mode
  const pkg = createTestChange({
    ecosystem: 'npm',
    name: 'test-package',
    version: 'invalid-version-string',
    vulnerabilities: [
      createTestVulnerability({
        advisory_ghsa_id: 'GHSA-test-5678',
        advisory_summary: 'Test vulnerability',
        severity: 'high'
      })
    ]
  })

  mockOctokitRequest.mockResolvedValueOnce({
    data: {
      vulnerabilities: [
        {
          package: {
            ecosystem: 'npm',
            name: 'test-package'
          },
          vulnerable_version_range: '>= 1.0.0, < 2.0.0',
          first_patched_version: '2.0.0'
        }
      ]
    }
  })

  const changes = [pkg]
  await summary.addChangeVulnerabilitiesToSummary(changes, 'low', true)

  const text = core.summary.stringify()

  // Should show N/A since version can't be coerced or matched
  expect(text).toContain('N/A')
})

test('addChangeVulnerabilitiesToSummary() - respects concurrency limit for API calls', async () => {
  // Create 15 packages with different vulnerabilities to test concurrency limiting
  const packages = Array.from({length: 15}, (_, i) =>
    createTestChange({
      ecosystem: 'npm',
      name: `package-${i}`,
      version: '1.0.0',
      vulnerabilities: [
        createTestVulnerability({
          advisory_ghsa_id: `GHSA-test-${i.toString().padStart(4, '0')}`,
          advisory_summary: `Vulnerability ${i}`,
          severity: 'high'
        })
      ]
    })
  )

  // Track concurrent calls
  let maxConcurrent = 0
  let currentConcurrent = 0

  mockOctokitRequest.mockImplementation(async () => {
    currentConcurrent++
    maxConcurrent = Math.max(maxConcurrent, currentConcurrent)

    // Simulate async API call with a small deterministic delay
    await new Promise(resolve => setTimeout(resolve, 5))

    currentConcurrent--

    return {
      data: {
        vulnerabilities: [
          {
            package: {ecosystem: 'npm', name: 'test'},
            vulnerable_version_range: '>= 1.0.0, < 2.0.0',
            first_patched_version: '2.0.0'
          }
        ]
      }
    }
  })

  await summary.addChangeVulnerabilitiesToSummary(packages, 'low', true)

  // Verify that concurrency limit (10) was respected
  expect(maxConcurrent).toBeLessThanOrEqual(10)
  // Verify all 15 unique advisories were fetched
  expect(mockOctokitRequest).toHaveBeenCalledTimes(15)
})

test('addChangeVulnerabilitiesToSummary() - completes all tasks even with varying durations', async () => {
  // Test that promise pool doesn't lose tasks when some complete faster than others
  const packages = Array.from({length: 20}, (_, i) =>
    createTestChange({
      ecosystem: 'npm',
      name: `package-${i}`,
      version: '1.0.0',
      vulnerabilities: [
        createTestVulnerability({
          advisory_ghsa_id: `GHSA-vary-${i.toString().padStart(4, '0')}`,
          advisory_summary: `Vulnerability ${i}`,
          severity: 'high'
        })
      ]
    })
  )

  const completedAdvisories = new Set<string>()

  mockOctokitRequest.mockImplementation(
    async (path: string, params: {ghsa_id: string}) => {
      // Variable delay to simulate real-world API response times
      const delay = Math.random() * 50
      await new Promise(resolve => setTimeout(resolve, delay))

      completedAdvisories.add(params.ghsa_id)

      return {
        data: {
          vulnerabilities: [
            {
              package: {ecosystem: 'npm', name: 'test'},
              vulnerable_version_range: '>= 1.0.0, < 2.0.0',
              first_patched_version: '2.0.0'
            }
          ]
        }
      }
    }
  )

  await summary.addChangeVulnerabilitiesToSummary(packages, 'low', true)

  // Verify all 20 unique advisories were fetched and completed
  expect(completedAdvisories.size).toBe(20)
  expect(mockOctokitRequest).toHaveBeenCalledTimes(20)
})

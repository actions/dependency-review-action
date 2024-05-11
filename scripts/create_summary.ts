/**
 * This scripts creates example markdown files for the summary in the ./tmp folder.
 * You can use it to preview changes to the summary.
 *
 * You can execute it like this:
 * npx ts-node scripts/create_summary.ts
 */

import {
  Change,
  Changes,
  ConfigurationOptions,
  ConfigurationOptionsSchema,
  Scorecard
} from '../src/schemas'
import {createTestChange} from '../__tests__/fixtures/create-test-change'
import {InvalidLicenseChanges} from '../src/licenses'
import * as fs from 'fs'
import * as core from '@actions/core'
import * as summary from '../src/summary'
import * as path from 'path'

const defaultConfig: ConfigurationOptions = ConfigurationOptionsSchema.parse({
  vulnerability_check: true,
  license_check: true,
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  allow_ghsas: [],
  allow_licenses: ['MIT'],
  deny_licenses: [],
  deny_packages: [],
  deny_groups: [],
  allow_dependencies_licenses: [
    'pkg:npm/express@4.17.1',
    'pkg:pypi/requests',
    'pkg:pypi/certifi',
    'pkg:pypi/pycrypto@2.6.1'
  ],
  comment_summary_in_pr: true,
  retry_on_snapshot_warnings: false,
  retry_on_snapshot_warnings_timeout: 120,
  warn_only: false,
  warn_on_openssf_scorecard_level: 3,
  show_openssf_scorecard: true
})

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

const tmpDir = path.resolve(__dirname, '../tmp')

const createExampleSummaries = async (): Promise<void> => {
  await fs.promises.mkdir(tmpDir, {recursive: true})

  await createNonIssueSummary()
  await createFullSummary()
}

const createNonIssueSummary = async (): Promise<void> => {
  await createSummary(
    [],
    {forbidden: [], unresolved: [], unlicensed: []},
    [],
    defaultConfig,
    'non-issue-summary.md'
  )
}

const createFullSummary = async (): Promise<void> => {
  const changes = [createTestChange()]
  const licenses: InvalidLicenseChanges = {
    forbidden: [
      createTestChange({
        name: 'underscore',
        version: '1.12.0',
        license: 'Apache 2.0'
      })
    ],
    unresolved: [
      createTestChange({
        name: 'octoinvader',
        license: 'Non SPDX License'
      }),
      createTestChange({
        name: 'owner/action-1',
        license: 'XYZ-License',
        version: 'v1.2.2',
        manifest: '.github/workflows/action.yml'
      })
    ],
    unlicensed: [
      createTestChange({
        name: 'my-other-dependency',
        license: null
      }),
      createTestChange({
        name: 'owner/action-2',
        version: 'main',
        license: null,
        manifest: '.github/workflows/action.yml'
      })
    ]
  }

  await createSummary(changes, licenses, [], defaultConfig, 'full-summary.md')
}

async function createSummary(
  vulnerabilities: Changes,
  licenseIssues: InvalidLicenseChanges,
  denied: Change[],
  config: ConfigurationOptions,
  fileName: string
): Promise<void> {
  summary.addSummaryToSummary(
    vulnerabilities,
    licenseIssues,
    denied,
    scorecard,
    config
  )
  summary.addChangeVulnerabilitiesToSummary(
    vulnerabilities,
    config.fail_on_severity
  )
  summary.addLicensesToSummary(licenseIssues, defaultConfig)

  const allChanges = [
    ...vulnerabilities,
    ...licenseIssues.forbidden,
    ...licenseIssues.unresolved,
    ...licenseIssues.unlicensed
  ]

  summary.addScannedDependencies(allChanges)

  const text = core.summary.stringify()
  await fs.promises.writeFile(path.resolve(tmpDir, fileName), text, {
    flag: 'w'
  })
  core.summary.emptyBuffer()
}

createExampleSummaries()

import {Changes, ConfigurationOptions} from '../src/schemas'
import {createTestChange} from '../__tests__/fixtures/create-test-change'
import {InvalidLicenseChanges} from '../src/licenses'
import * as fs from 'fs'
import * as core from '@actions/core'
import * as summary from '../src/summary'
import * as path from 'path'

const defaultConfig: ConfigurationOptions = {
  vulnerability_check: true,
  license_check: true,
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  allow_ghsas: [],
  allow_licenses: ['MIT'],
  deny_licenses: [],
  comment_summary_in_pr: true
}

const tmpDir = path.resolve(__dirname, '../tmp')

const createExampleSummaries = async (): Promise<void> => {
  await fs.promises.mkdir(tmpDir, {recursive: true})

  await createNonIssueSummary()
  await createFullSummary()
}

const createNonIssueSummary = async (): Promise<void> => {
  summary.addSummaryToSummary(
    [],
    {forbidden: [], unresolved: [], unlicensed: []},
    defaultConfig
  )
  const text = core.summary.stringify()

  await fs.promises.writeFile(path.resolve(tmpDir, 'green-summary.md'), text)
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
      })
    ],
    unlicensed: [
      createTestChange({
        name: 'my-other-dependency',
        license: 'No License'
      })
    ]
  }

  const text = createSummary(changes, licenses, defaultConfig)
  await fs.promises.writeFile(path.resolve(tmpDir, 'full-summary.md'), text)
}

function createSummary(
  vulnerabilities: Changes,
  licenseIssues: InvalidLicenseChanges,
  config: ConfigurationOptions
): string {
  summary.addSummaryToSummary(vulnerabilities, licenseIssues, config)
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
  core.summary.emptyBuffer()
  return text
}

createExampleSummaries()

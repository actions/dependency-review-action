import * as core from '@actions/core'
import {z} from 'zod'
import {ConfigurationOptions, ConfigurationOptionsSchema} from './schemas'
import {Severity} from './schemas'

export const CONFIG_FILEPATH = './.github/dependency-review.yml'

export function readConfig(): ConfigurationOptions {
  // By default we want to fail on all severities and allow all licenses.
  let options: ConfigurationOptions = {}

  let severity = core.getInput('fail-on-severity')
  let allowedLicenses = core.getInput('allowed-licenses')
  let denyLicenses = core.getInput('deny-licenses')

  // TODO test the empty string case
  if (severity.length > 0) {
    options.fail_on_severity = severity as Severity
  }

  if (allowedLicenses.length > 0) {
    options.allow_licenses = allowedLicenses.split(',').map(s => s.trim())
  }

  if (denyLicenses.length > 0) {
    options.deny_licenses = denyLicenses.split(',').map(s => s.trim())
  }

  return ConfigurationOptionsSchema.parse(options)
}

import * as core from '@actions/core'
import {
  ConfigurationOptions,
  ConfigurationOptionsSchema,
  Severity
} from './schemas'

export function readConfig(): ConfigurationOptions {
  let options: ConfigurationOptions = {}

  // By default we want to fail on all severities and allow all licenses.
  const severity = core.getInput('fail-on-severity') || 'low'
  const allowedLicenses = core.getInput('allowed-licenses')
  const denyLicenses = core.getInput('deny-licenses')

  options.fail_on_severity = severity as Severity

  if (allowedLicenses.length > 0) {
    options.allow_licenses = allowedLicenses.split(',').map(s => s.trim())
  }

  if (denyLicenses.length > 0) {
    options.deny_licenses = denyLicenses.split(',').map(s => s.trim())
  }

  // we call parse on the ConfigurationOptions object because we want Zod
  // to validate part of the input.
  return ConfigurationOptionsSchema.parse(options)
}

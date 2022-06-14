import * as core from '@actions/core'
import * as z from 'zod'
import {ConfigurationOptions, SEVERITIES} from './schemas'

function getOptionalInput(name: string): string | undefined {
  const value = core.getInput(name)
  return value.length > 0 ? value : undefined
}

export function readConfig(): ConfigurationOptions {
  const fail_on_severity = z
    .enum(SEVERITIES)
    .default('low')
    .parse(getOptionalInput('fail-on-severity'))
  const allow_licenses = getOptionalInput('allow-licenses')
  const deny_licenses = getOptionalInput('deny-licenses')

  if (allow_licenses !== undefined && deny_licenses !== undefined) {
    throw new Error("Can't specify both allow_licenses and deny_licenses")
  }

  return {
    fail_on_severity,
    allow_licenses: allow_licenses?.split(',').map(x => x.trim()),
    deny_licenses: deny_licenses?.split(',').map(x => x.trim())
  }
}

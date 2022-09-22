import * as fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import * as core from '@actions/core'
import * as z from 'zod'
import {
  ConfigurationOptions,
  ConfigurationOptionsSchema,
  SeveritySchema,
  SCOPES
} from './schemas'

function getOptionalInput(name: string): string | undefined {
  const value = core.getInput(name)
  return value.length > 0 ? value : undefined
}

function parseList(list: string | undefined): string[] | undefined {
  if (list === undefined) {
    return list
  } else {
    return list.split(',').map(x => x.trim())
  }
}

export function readConfig(): ConfigurationOptions {
  const externalConfig = getOptionalInput('config-file')
  if (externalConfig !== undefined) {
    const config = readConfigFile(externalConfig)
    // the reasoning behind reading the inline config when an external
    // config file is provided is that we still want to allow users to
    // pass inline options in the presence of an external config file.
    const inlineConfig = readInlineConfig()
    // the external config takes precedence
    return Object.assign({}, inlineConfig, config)
  } else {
    return readInlineConfig()
  }
}

export function readInlineConfig(): ConfigurationOptions {
  const fail_on_severity = SeveritySchema.parse(
    getOptionalInput('fail-on-severity')
  )
  const fail_on_scopes = z
    .array(z.enum(SCOPES))
    .default(['runtime'])
    .parse(parseList(getOptionalInput('fail-on-scopes')))

  const allow_licenses = getOptionalInput('allow-licenses')
  const deny_licenses = getOptionalInput('deny-licenses')

  if (allow_licenses !== undefined && deny_licenses !== undefined) {
    throw new Error("Can't specify both allow_licenses and deny_licenses")
  }

  const base_ref = getOptionalInput('base-ref')
  const head_ref = getOptionalInput('head-ref')

  return {
    fail_on_severity,
    fail_on_scopes,
    allow_licenses: parseList(allow_licenses),
    deny_licenses: parseList(deny_licenses),
    base_ref,
    head_ref
  }
}

export function readConfigFile(filePath: string): ConfigurationOptions {
  let data

  try {
    data = fs.readFileSync(path.resolve(filePath), 'utf-8')
  } catch (error: unknown) {
    throw error
  }
  data = YAML.parse(data)

  // get rid of the ugly dashes from the actions conventions
  for (const key of Object.keys(data)) {
    if (key.includes('-')) {
      data[key.replace(/-/g, '_')] = data[key]
      delete data[key]
    }
  }
  const values = ConfigurationOptionsSchema.parse(data)
  return values
}

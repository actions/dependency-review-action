import * as fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import * as core from '@actions/core'
import * as z from 'zod'
import {ConfigurationOptions, ConfigurationOptionsSchema} from './schemas'
import {isSPDXValid, octokitClient} from './utils'

type ConfigurationOptionsPartial = Partial<ConfigurationOptions>

function getOptionalBoolean(name: string): boolean | undefined {
  const value = core.getInput(name)
  return value.length > 0 ? core.getBooleanInput(name) : undefined
}

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

function validateLicenses(
  key: 'allow-licenses' | 'deny-licenses',
  licenses: string[] | undefined
): void {
  if (licenses === undefined) {
    return
  }
  const invalid_licenses = licenses.filter(license => !isSPDXValid(license))

  if (invalid_licenses.length > 0) {
    throw new Error(
      `Invalid license(s) in ${key}: ${invalid_licenses.join(', ')}`
    )
  }
}

export async function readConfig(): Promise<ConfigurationOptions> {
  const inlineConfig = readInlineConfig()

  const configFile = getOptionalInput('config-file')
  if (configFile !== undefined) {
    const externalConfig = await readConfigFile(configFile)
    // TO DO check order of precedence
    return mergeConfigs(externalConfig, inlineConfig)
  }

  return ConfigurationOptionsSchema.parse(inlineConfig)
}

export function readInlineConfig(): ConfigurationOptionsPartial {
  const fail_on_severity = getOptionalInput('fail-on-severity')

  const fail_on_scopes = parseList(getOptionalInput('fail-on-scopes'))

  const allow_licenses = parseList(getOptionalInput('allow-licenses'))
  const deny_licenses = parseList(getOptionalInput('deny-licenses'))

  validateLicenses('allow-licenses', allow_licenses)
  validateLicenses('deny-licenses', deny_licenses)

  const allow_ghsas = parseList(getOptionalInput('allow-ghsas'))

  const license_check = getOptionalBoolean('license-check')
  const vulnerability_check = getOptionalBoolean('vulnerability-check')

  const base_ref = getOptionalInput('base-ref')
  const head_ref = getOptionalInput('head-ref')

  const data = {
    fail_on_severity,
    fail_on_scopes,
    allow_licenses,
    deny_licenses,
    allow_ghsas,
    license_check,
    vulnerability_check,
    base_ref,
    head_ref
  }

  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
}

export async function readConfigFile(
  filePath: string
): Promise<ConfigurationOptionsPartial> {
  const format = new RegExp(
    '(?<owner>[^/]+)/(?<repo>[^/]+)/(?<path>[^@]+)@(?<ref>.*)'
  )
  let data: string

  const pieces = format.exec(filePath)
  try {
    if (pieces?.groups && pieces.length === 5) {
      data = await getRemoteConfig({
        owner: pieces.groups.owner,
        repo: pieces.groups.repo,
        path: pieces.groups.path,
        ref: pieces.groups.ref
      })
    } else {
      data = fs.readFileSync(path.resolve(filePath), 'utf-8')
    }
    return parseConfigFile(data)
  } catch (error) {
    core.debug(error as string)
    throw new Error('Unable to fetch config file')
  }
}

export function parseConfigFile(
  configData: string
): ConfigurationOptionsPartial {
  try {
    const data = YAML.parse(configData)
    for (const key of Object.keys(data)) {
      if (key === 'allow-licenses' || key === 'deny-licenses') {
        validateLicenses(key, data[key])
      }
      // get rid of the ugly dashes from the actions conventions
      if (key.includes('-')) {
        data[key.replace(/-/g, '_')] = data[key]
        delete data[key]
      }
    }
    return data
  } catch (error) {
    throw error
  }
}

async function getRemoteConfig(configOpts: {
  [key: string]: string
}): Promise<string> {
  try {
    const {data} = await octokitClient(
      'remote-config-repo-token',
      false
    ).rest.repos.getContent({
      mediaType: {
        format: 'raw'
      },
      owner: configOpts.owner,
      repo: configOpts.repo,
      path: configOpts.path,
      ref: configOpts.ref
    })

    // When using mediaType.format = 'raw', the response.data is a string but this is not reflected
    // in the return type of getContent. So we're casting the return value to a string.
    return z.string().parse(data as unknown)
  } catch (error) {
    core.debug(error as string)
    throw new Error('Error fetching remote config file')
  }
}

function mergeConfigs(
  baseConfig: ConfigurationOptionsPartial,
  prioConfig: ConfigurationOptionsPartial
): ConfigurationOptions {
  const mergedConfig: {[key: string]: unknown} = {...baseConfig}

  for (const key of Object.keys(prioConfig) as (keyof typeof prioConfig)[]) {
    // based on the assumption that ConfigurationOptions values are either arrays or primitive types
    // former are merged, latter are overwritten
    if (key in mergedConfig && Array.isArray(mergedConfig[key])) {
      // casting to unknown[] needed. TS unable to auto infer
      mergedConfig[key] = [
        ...(mergedConfig[key] as unknown[]),
        ...(prioConfig[key] as unknown[])
      ]
    } else {
      mergedConfig[key] = prioConfig[key]
    }
  }

  return ConfigurationOptionsSchema.parse(mergedConfig)
}

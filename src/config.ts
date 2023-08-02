import * as fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import * as core from '@actions/core'
import * as z from 'zod'
import {ConfigurationOptions, ConfigurationOptionsSchema} from './schemas'
import {isSPDXValid, octokitClient} from './utils'
import {PackageURL} from 'packageurl-js'

type ConfigurationOptionsPartial = Partial<ConfigurationOptions>

export async function readConfig(): Promise<ConfigurationOptions> {
  const inlineConfig = readInlineConfig()

  const configFile = getOptionalInput('config-file')
  if (configFile !== undefined) {
    const externalConfig = await readConfigFile(configFile)

    return ConfigurationOptionsSchema.parse({
      ...externalConfig,
      ...inlineConfig
    })
  }

  return ConfigurationOptionsSchema.parse(inlineConfig)
}

function readInlineConfig(): ConfigurationOptionsPartial {
  const fail_on_severity = getOptionalInput('fail-on-severity')
  const fail_on_scopes = parseList(getOptionalInput('fail-on-scopes'))
  const allow_licenses = parseList(getOptionalInput('allow-licenses'))
  const deny_licenses = parseList(getOptionalInput('deny-licenses'))
  const allow_dependencies_licenses = parseList(
    getOptionalInput('allow-dependencies-licenses')
  )
  const deny_list = parseList(getOptionalInput('deny-dependencies'))
  const allow_ghsas = parseList(getOptionalInput('allow-ghsas'))
  const license_check = getOptionalBoolean('license-check')
  const vulnerability_check = getOptionalBoolean('vulnerability-check')
  const base_ref = getOptionalInput('base-ref')
  const head_ref = getOptionalInput('head-ref')
  const comment_summary_in_pr = getOptionalBoolean('comment-summary-in-pr')

  validatePURL(allow_dependencies_licenses)
  validateLicenses('allow-licenses', allow_licenses)
  validateLicenses('deny-licenses', deny_licenses)

  const keys = {
    fail_on_severity,
    fail_on_scopes,
    allow_licenses,
    deny_licenses,
    deny_list,
    allow_dependencies_licenses,
    allow_ghsas,
    license_check,
    vulnerability_check,
    base_ref,
    head_ref,
    comment_summary_in_pr
  }

  return Object.fromEntries(
    Object.entries(keys).filter(([_, value]) => value !== undefined)
  )
}

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
    throw new Error(`Invalid license(s) in ${key}: ${invalid_licenses}`)
  }
}

async function readConfigFile(
  filePath: string
): Promise<ConfigurationOptionsPartial> {
  // match a remote config (e.g. 'owner/repo/filepath@someref')
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
    throw new Error(
      `Unable to fetch or parse config file: ${(error as Error).message}`
    )
  }
}

function parseConfigFile(configData: string): ConfigurationOptionsPartial {
  try {
    const data = YAML.parse(configData)

    // These are the options that we support where the user can provide
    // either a YAML list or a comma-separated string.
    const listKeys = [
      'allow-licenses',
      'deny-licenses',
      'fail-on-scopes',
      'allow-ghsas',
      'allow-dependencies-licenses'
    ]

    for (const key of Object.keys(data)) {
      // strings can contain list values (e.g. 'MIT, Apache-2.0'). In this
      // case we need to parse that into a list (e.g. ['MIT', 'Apache-2.0']).
      if (listKeys.includes(key)) {
        const val = data[key]

        if (typeof val === 'string') {
          data[key] = val.split(',').map(x => x.trim())
        }
      }

      // perform SPDX validation
      if (key === 'allow-licenses' || key === 'deny-licenses') {
        validateLicenses(key, data[key])
      }

      // validate purls from the allow-dependencies-licenses
      if (key === 'allow-dependencies-licenses') {
        validatePURL(data[key])
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
      'external-repo-token',
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

    // When using mediaType.format = 'raw', the response.data is a string
    // but this is not reflected in the return type of getContent, so we're
    // casting the return value to a string.
    return z.string().parse(data as unknown)
  } catch (error) {
    core.debug(error as string)
    throw new Error('Error fetching remote config file')
  }
}
function validatePURL(allow_dependencies_licenses: string[] | undefined): void {
  //validate that the provided elements of the string are in valid purl format
  if (allow_dependencies_licenses === undefined) {
    return
  }
  const invalid_purls = allow_dependencies_licenses.filter(
    purl => !PackageURL.fromString(purl)
  )

  if (invalid_purls.length > 0) {
    throw new Error(
      `Invalid purl(s) in allow-dependencies-licenses: ${invalid_purls}`
    )
  }
  return
}

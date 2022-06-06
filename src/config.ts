import * as fs from 'fs'
import YAML from 'yaml'
import {ConfigurationOptions, ConfigurationOptionsSchema} from './schemas'
import path from 'path'

export const CONFIG_FILEPATH = './.github/dependency-review.yml'

export function readConfigFile(
  filePath: string = CONFIG_FILEPATH
): ConfigurationOptions {
  // By default we want to fail on all severities and allow all licenses.
  const defaultOptions: ConfigurationOptions = {
    fail_on_severity: 'low',
    allow_licenses: []
  }

  let data

  try {
    data = fs.readFileSync(path.resolve(filePath), 'utf-8')
  } catch (error: any) {
    if (error.code && error.code === 'ENOENT') {
      return defaultOptions
    } else {
      throw error
    }
  }

  return ConfigurationOptionsSchema.parse(YAML.parse(data))
}

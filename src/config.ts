import * as fs from 'fs'
import YAML from 'yaml'
import { ConfigurationOptions, ConfigurationOptionsSchema } from './schemas'
import path from 'path'

export type Severity = "critical" | "high" | "moderate" | "low"

export const SEVERITIES = ["critical", "high", "moderate", "low"] as const
export const CONFIG_FILEPATH = "./.github/dep-review.yml"

export function readConfigFile(filePath: string = CONFIG_FILEPATH): ConfigurationOptions {
    // By default we want to fail on all severities and allow all licenses.
    const defaultOptions: ConfigurationOptions = {
        fail_on_severity: 'low',
        allow_licenses: []
    }

    let data

    try {
        data = fs.readFileSync(path.resolve(filePath), "utf-8");
    } catch (error: any) {
        if (error.code && error.code === 'ENOENT') {
            return defaultOptions
        } else {
            throw error
        }
    }

    // This is a copy of line 34, not sure why this is failing!
    ConfigurationOptionsSchema.parse({ fail_on_severity: 'critical', allow_licenses: ['BSD', 'GPL 2'] })

    const values = YAML.parse(data)
    const parsed = ConfigurationOptionsSchema.parse(values)

    return parsed;
}

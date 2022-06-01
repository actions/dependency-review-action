import * as fs from 'fs'
import YAML from 'yaml'
import * as z from 'zod'
import path from 'path'

export type Severity = "critical" | "high" | "moderate" | "low"

export const SEVERITIES = ["critical", "high", "moderate", "low"] as const
export const CONFIG_FILEPATH = "./.github/dep-review.yml"

type ConfigurationOptions = {
    fail_on_severity: string,
    allow_licenses: Array<string>,
    deny_licenses: Array<string>
}

export function readConfigFile(filePath: string = CONFIG_FILEPATH): ConfigurationOptions {
    // By default we want to fail on all severities and allow all licenses.
    const defaultOptions: ConfigurationOptions = {
        fail_on_severity: "low",
        allow_licenses: ['all'],
        deny_licenses: []
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

    const values = YAML.parse(data)

    const parsed = z.object({
        fail_on_severity: z.enum(SEVERITIES),
        allow_licenses: z.array(z.string()),
        deny_licenses: z.array(z.string())
    })
        .partial()
        .refine(obj => !(obj.allow_licenses && obj.deny_licenses), "Can't specify both allow_licenses and deny_licenses")
        .parse(values)

    return <ConfigurationOptions>parsed;
}

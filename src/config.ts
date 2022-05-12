import * as fs from 'fs'
import YAML from 'yaml'
import * as z from 'zod'

const CONFIG_FILEPATH = "./.github/dep-review.yml"
const SEVERITIES = ["critical", "high", "moderate", "low"]

// TODO check for file not existing
// TODO check for file with both extensions
// TODO parse yaml format, validate keys

var severity: string
var allowlist, blocklist: [string]

var data = fs.readFile(CONFIG_FILEPATH, "utf-8", (err, data) => {
    const values = YAML.parse(data)
    const parsed = z.object({
        fail_on_severity: z.enum(SEVERITIES),
        allow_licenses: z.array(z.string()),
        deny_licenses: z.array(z.string())
    })
        .partial()
        .refine(obj => !(obj.allow_licenses && obj.deny_licenses), "Can't specify both allow_licenses and deny_licenses")
        .parse(values)

    // vlaidate licenses dynamically
    core.info(parsed.fail_on_severity!)
    //core.info(values["allow_licenses"])
    //core.info(values["deny_licenses"])
})
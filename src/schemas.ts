import * as z from 'zod'
import {parsePURL} from './purl'

export const SEVERITIES = ['critical', 'high', 'moderate', 'low'] as const
export const SCOPES = ['unknown', 'runtime', 'development'] as const

export const SeveritySchema = z.enum(SEVERITIES).default('low')

const PackageURL = z
  .string()
  .transform(purlString => {
    return parsePURL(purlString)
  })
  .superRefine((purl, context) => {
    if (purl.error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error parsing package-url: ${purl.error}`
      })
    }
    if (!purl.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error parsing package-url: name is required`
      })
    }
  })

const PackageURLWithNamespace = z
  .string()
  .transform(purlString => {
    return parsePURL(purlString)
  })
  .superRefine((purl, context) => {
    if (purl.error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Error parsing purl: ${purl.error}`
      })
    }
    if (purl.namespace === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `package-url must have a namespace, and the namespace must be followed by '/'`
      })
    }
  })

const PackageURLString = z.string().superRefine((value, context) => {
  const purl = parsePURL(value)
  if (purl.error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Error parsing package-url: ${purl.error}`
    })
  }
  if (!purl.name) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Error parsing package-url: name is required`
    })
  }
})

export const TrustySummarySchema = z.object({
  malicious: z.boolean().optional(),
  activity_user: z.number(),
  activity_repo: z.number(),
  from: z.string(),
  activity: z.number(),
  provenance: z.number(),
  typosquatting: z.number()
})

export const TrustySchema = z.object({
  archived: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  score: z.number().optional(),
  status: z.string().optional(),
  status_code: z.number().optional(),
  description: TrustySummarySchema.optional(),
  updated_at: z.string().optional() // or z.date() if you want to parse the string into a Date object
})

export const ChangeSchema = z.object({
  change_type: z.enum(['added', 'removed']),
  manifest: z.string(),
  ecosystem: z.string(),
  name: z.string(),
  version: z.string(),
  package_url: z.string(),
  license: z.string().nullable(),
  source_repository_url: z.string().nullable(),
  scope: z.enum(SCOPES).optional(),
  trusty: TrustySchema.optional(),
  vulnerabilities: z
    .array(
      z.object({
        severity: SeveritySchema,
        advisory_ghsa_id: z.string(),
        advisory_summary: z.string(),
        advisory_url: z.string()
      })
    )
    .optional()
    .default([])
})

export const UpdateSchema = z.object({
  added: ChangeSchema.optional(), // Add an empty object as an argument
  removed: ChangeSchema.optional()
})

export const PullRequestSchema = z.object({
  number: z.number(),
  base: z.object({sha: z.string()}),
  head: z.object({sha: z.string()})
})

export const ConfigurationOptionsSchema = z
  .object({
    fail_on_severity: SeveritySchema,
    fail_on_scopes: z.array(z.enum(SCOPES)).default(['runtime']),
    allow_licenses: z.array(z.string()).optional(),
    deny_licenses: z.array(z.string()).optional(),
    allow_dependencies_licenses: z.array(PackageURLString).optional(),
    allow_ghsas: z.array(z.string()).default([]),
    deny_packages: z.array(PackageURL).default([]),
    deny_groups: z.array(PackageURLWithNamespace).default([]),
    license_check: z.boolean().default(true),
    vulnerability_check: z.boolean().default(true),
    config_file: z.string().optional(),
    base_ref: z.string().optional(),
    head_ref: z.string().optional(),
    retry_on_snapshot_warnings: z.boolean().default(false),
    retry_on_snapshot_warnings_timeout: z.number().default(120),
    show_openssf_scorecard: z.boolean().optional().default(true),
    warn_on_openssf_scorecard_level: z.number().default(3),
    trusty_scores: z.boolean().optional().default(false),
    trusty_retries: z.number().optional().default(3),
    trusty_show: z.number().optional().default(7),
    trusty_warn: z.number().optional().default(5),
    trusty_fail: z.number().optional().default(1),
    trusty_api: z.string().default('https://gh.trustypkg.dev'),
    trusty_ui: z.string().default('https://trustypkg.dev'),
    comment_summary_in_pr: z
      .union([
        z.preprocess(
          val => (val === 'true' ? true : val === 'false' ? false : val),
          z.boolean()
        ),
        z.enum(['always', 'never', 'on-failure'])
      ])
      .default('never'),
    warn_only: z.boolean().default(false)
  })
  .transform(config => {
    if (config.comment_summary_in_pr === true) {
      config.comment_summary_in_pr = 'always'
    } else if (config.comment_summary_in_pr === false) {
      config.comment_summary_in_pr = 'never'
    }
    return config
  })
  .superRefine((config, context) => {
    if (config.allow_licenses && config.deny_licenses) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You cannot specify both allow-licenses and deny-licenses'
      })
    }
    if (config.allow_licenses && config.allow_licenses.length < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You should provide at least one license in allow-licenses'
      })
    }
    if (
      config.license_check === false &&
      config.vulnerability_check === false
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Can't disable both license-check and vulnerability-check"
      })
    }
  })

export const ChangesSchema = z.array(ChangeSchema)
export const UpdatesSchema = z.array(UpdateSchema)
export const ComparisonResponseSchema = z.object({
  changes: z.array(ChangeSchema),
  snapshot_warnings: z.string()
})

export const ScorecardApiSchema = z.object({
  date: z.string(),
  repo: z
    .object({
      name: z.string(),
      commit: z.string()
    })
    .nullish(),
  scorecard: z
    .object({
      version: z.string(),
      commit: z.string()
    })
    .nullish(),
  checks: z
    .array(
      z.object({
        name: z.string(),
        documentation: z.object({
          shortDescription: z.string(),
          url: z.string()
        }),
        score: z.string(),
        reason: z.string(),
        details: z.array(z.string())
      })
    )
    .nullish(),
  score: z.number().nullish()
})

export const ScorecardSchema = z.object({
  dependencies: z.array(
    z.object({
      change: ChangeSchema,
      scorecard: ScorecardApiSchema.nullish()
    })
  )
})

export type Change = z.infer<typeof ChangeSchema>
export type Changes = z.infer<typeof ChangesSchema>
export type Update = z.infer<typeof UpdateSchema>
export type Updates = z.infer<typeof UpdatesSchema>
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>
export type ConfigurationOptions = z.infer<typeof ConfigurationOptionsSchema>
export type Severity = z.infer<typeof SeveritySchema>
export type Scope = (typeof SCOPES)[number]
export type Scorecard = z.infer<typeof ScorecardSchema>
export type ScorecardApi = z.infer<typeof ScorecardApiSchema>
export type Trusty = z.infer<typeof TrustySchema>
export type TrustySummary = z.infer<typeof TrustySummarySchema>

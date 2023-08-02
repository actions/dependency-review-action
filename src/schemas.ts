import * as z from 'zod'

export const SEVERITIES = ['critical', 'high', 'moderate', 'low'] as const
export const SCOPES = ['unknown', 'runtime', 'development'] as const

export const SeveritySchema = z.enum(SEVERITIES).default('low')

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
    allow_dependencies_licenses: z.array(z.string()).optional(),
    allow_ghsas: z.array(z.string()).default([]),
    deny_list: z.array(z.string()).default([]),
    license_check: z.boolean().default(true),
    vulnerability_check: z.boolean().default(true),
    config_file: z.string().optional(),
    base_ref: z.string().optional(),
    head_ref: z.string().optional(),
    comment_summary_in_pr: z.boolean().default(false)
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
export const ComparisonResponseSchema = z.object({
  changes: z.array(ChangeSchema),
  snapshot_warnings: z.string()
})

export type Change = z.infer<typeof ChangeSchema>
export type Changes = z.infer<typeof ChangesSchema>
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>
export type ConfigurationOptions = z.infer<typeof ConfigurationOptionsSchema>
export type Severity = z.infer<typeof SeveritySchema>
export type Scope = (typeof SCOPES)[number]

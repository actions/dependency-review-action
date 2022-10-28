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
    allow_licenses: z.array(z.string()).default([]),
    deny_licenses: z.array(z.string()).default([]),
    allow_ghsas: z.array(z.string()).default([]),
    license_check: z.boolean().default(true),
    vulnerability_check: z.boolean().default(true),
    config_file: z.string().optional().default('false'),
    base_ref: z.string(),
    head_ref: z.string()
  })
  .partial()
  .refine(
    obj => !(obj.allow_licenses && obj.deny_licenses),
    'Your workflow file has both an allow_licenses list and deny_licenses list, but you can only set one or the other.'
  )

export const ChangesSchema = z.array(ChangeSchema)

export type Change = z.infer<typeof ChangeSchema>
export type Changes = z.infer<typeof ChangesSchema>
export type ConfigurationOptions = z.infer<typeof ConfigurationOptionsSchema>
export type Severity = z.infer<typeof SeveritySchema>
export type Scope = typeof SCOPES[number]

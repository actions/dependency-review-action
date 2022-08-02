import * as z from 'zod'

export const SEVERITIES = ['critical', 'high', 'moderate', 'low'] as const

export const ChangeSchema = z.object({
  change_type: z.enum(['added', 'removed']),
  manifest: z.string(),
  ecosystem: z.string(),
  name: z.string(),
  version: z.string(),
  package_url: z.string(),
  license: z.string().nullable(),
  source_repository_url: z.string().nullable(),
  vulnerabilities: z
    .array(
      z.object({
        severity: z.enum(['critical', 'high', 'moderate', 'low']),
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
    fail_on_severity: z.enum(SEVERITIES).default('low'),
    allow_licenses: z.array(z.string()).default([]),
    deny_licenses: z.array(z.string()).default([]),
    check_name_vulnerability: z.string().nullable(),
    check_name_license: z.string().nullable(),
    fail_on_violation: z.boolean().default(false)
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
export type Severity = typeof SEVERITIES[number]

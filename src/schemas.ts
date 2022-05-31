import * as z from 'zod'

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
})

export const PullRequestSchema = z.object({
  number: z.number(),
  base: z.object({ sha: z.string() }),
  head: z.object({ sha: z.string() })
})

export const ChangesSchema = z.array(ChangeSchema)
export type Change = z.infer<typeof ChangeSchema>
export type Changes = z.infer<typeof ChangesSchema>

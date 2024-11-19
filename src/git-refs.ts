import {
  PullRequestSchema,
  ConfigurationOptions,
  MergeGroupSchema
} from './schemas'

export function getRefs(
  config: ConfigurationOptions,
  context: {
    payload: {pull_request?: unknown; merge_group?: unknown}
    eventName: string
  }
): {base: string; head: string} {
  let base_ref = config.base_ref
  let head_ref = config.head_ref

  // If possible, source default base & head refs from the GitHub event.
  // The base/head ref from the config take priority, if provided.
  if (!base_ref && !head_ref) {
    if (
      context.eventName === 'pull_request' ||
      context.eventName === 'pull_request_target'
    ) {
      const pull_request = PullRequestSchema.parse(context.payload.pull_request)
      base_ref = base_ref || pull_request.base.sha
      head_ref = head_ref || pull_request.head.sha
    } else if (context.eventName === 'merge_group') {
      const merge_group = MergeGroupSchema.parse(context.payload.merge_group)
      base_ref = base_ref || merge_group.base_sha
      head_ref = head_ref || merge_group.head_sha
    }
  }

  if (!base_ref && !head_ref) {
    throw new Error(
      'Both a base ref and head ref must be provided, either via the `base_ref`/`head_ref` ' +
        'config options, `base-ref`/`head-ref` workflow action options, or by running a ' +
        '`pull_request`/`pull_request_target`/`merge_group` workflow.'
    )
  } else if (!base_ref) {
    throw new Error(
      'A base ref must be provided, either via the `base_ref` config option, ' +
        '`base-ref` workflow action option, or by running a ' +
        '`pull_request`/`pull_request_target`/`merge_group` workflow.'
    )
  } else if (!head_ref) {
    throw new Error(
      'A head ref must be provided, either via the `head_ref` config option, ' +
        '`head-ref` workflow action option, or by running a ' +
        'or by running a `pull_request`/`pull_request_target`/`merge_group` workflow.'
    )
  }

  return {
    base: base_ref,
    head: head_ref
  }
}

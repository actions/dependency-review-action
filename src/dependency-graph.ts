import * as core from '@actions/core'
import * as githubUtils from '@actions/github/lib/utils'
import * as retry from '@octokit/plugin-retry'
import {
  ChangesSchema,
  ComparisonResponse,
  ComparisonResponseSchema
} from './schemas'

const retryingOctokit = githubUtils.GitHub.plugin(retry.retry)
const SnapshotWarningsHeader = 'X-GitHub-Dependency-Graph-Snapshot-Warnings'
const octo = new retryingOctokit(
  githubUtils.getOctokitOptions(core.getInput('repo-token', {required: true}))
)

export async function compare({
  owner,
  repo,
  baseRef,
  headRef,
  includeDependencySnapshots
}: {
  owner: string
  repo: string
  baseRef: string
  headRef: string
  includeDependencySnapshots: boolean
}): Promise<ComparisonResponse> {
  let snapshot_warnings = ''
  const changes = await octo.paginate(
    {
      method: 'GET',
      url: '/repos/{owner}/{repo}/dependency-graph/compare/{basehead}',
      owner,
      repo,
      basehead: `${baseRef}...${headRef}`,
      includes_dependency_snapshots: includeDependencySnapshots
    },
    response => {
      if (
        response.headers[SnapshotWarningsHeader] &&
        typeof response.headers[SnapshotWarningsHeader] === 'string'
      ) {
        snapshot_warnings = Buffer.from(
          response.headers[SnapshotWarningsHeader],
          'base64'
        ).toString('utf-8')
      }
      return ChangesSchema.parse(response.data)
    }
  )
  return ComparisonResponseSchema.parse({
    changes,
    snapshot_warnings
  })
}

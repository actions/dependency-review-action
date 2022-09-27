import * as core from '@actions/core'
import * as githubUtils from '@actions/github/lib/utils'
import * as retry from '@octokit/plugin-retry'
import {Changes, ChangesSchema} from './schemas'

const retryingOctokit = githubUtils.GitHub.plugin(retry.retry)
const octo = new retryingOctokit(
  githubUtils.getOctokitOptions(core.getInput('repo-token', {required: true}))
)

export async function compare({
  owner,
  repo,
  baseRef,
  headRef
}: {
  owner: string
  repo: string
  baseRef: string
  headRef: string
}): Promise<Changes> {
  const changes = await octo.paginate(
    'GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}',
    {
      owner,
      repo,
      basehead: `${baseRef}...${headRef}`
    }
  )
  return ChangesSchema.parse(changes)
}

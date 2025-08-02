import * as github from '@actions/github'
import * as core from '@actions/core'
import * as githubUtils from '@actions/github/lib/utils'
import * as retry from '@octokit/plugin-retry'
import {RequestError} from '@octokit/request-error'
import {ConfigurationOptions} from './schemas'

export const MAX_COMMENT_LENGTH = 65536

const retryingOctokit = githubUtils.GitHub.plugin(retry.retry)
const octo = new retryingOctokit(
  githubUtils.getOctokitOptions(core.getInput('repo-token', {required: true}))
)

// Comment Marker to identify an existing comment to update, so we don't spam the PR with comments
const COMMENT_MARKER = '<!-- dependency-review-pr-comment-marker -->'

export async function commentPr(
  commentContent: string,
  config: ConfigurationOptions,
  issueFound: boolean
): Promise<void> {
  // For 'on-failure' mode, we need to handle both failure and success cases
  // - On failure: create/update comment with issues
  // - On success: update existing comment to show resolution (if one exists)
  const shouldComment =
    config.comment_summary_in_pr === 'always' ||
    (config.comment_summary_in_pr === 'on-failure' && issueFound) ||
    (config.comment_summary_in_pr === 'on-failure' &&
      !issueFound &&
      (await hasExistingComment()))

  if (!shouldComment) {
    return
  }

  if (!github.context.payload.pull_request) {
    core.warning(
      'Not in the context of a pull request. Skipping comment creation.'
    )
    return
  }

  const commentBody = `${commentContent}\n\n${COMMENT_MARKER}`

  try {
    const existingCommentId = await findCommentByMarker(COMMENT_MARKER)

    if (existingCommentId) {
      await octo.rest.issues.updateComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        comment_id: existingCommentId,
        body: commentBody
      })
    } else {
      await octo.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        body: commentBody
      })
    }
  } catch (error) {
    if (error instanceof RequestError && error.status === 403) {
      core.warning(
        `Unable to write summary to pull-request. Make sure you are giving this workflow the permission 'pull-requests: write'.`
      )
    } else {
      if (error instanceof Error) {
        core.warning(
          `Unable to comment summary to pull-request, received error: ${error.message}`
        )
      } else {
        core.warning(
          'Unable to comment summary to pull-request: Unexpected fatal error'
        )
      }
    }
  }
}

async function hasExistingComment(): Promise<boolean> {
  if (!github.context.payload.pull_request) {
    return false
  }

  const existingCommentId = await findCommentByMarker(COMMENT_MARKER)
  return existingCommentId !== undefined
}

async function findCommentByMarker(
  commentBodyIncludes: string
): Promise<number | undefined> {
  const commentsIterator = octo.paginate.iterator(
    octo.rest.issues.listComments,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      // We are already checking if we are in the context of a pull request in the caller
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      issue_number: github.context.payload.pull_request!.number
    }
  )

  for await (const {data: comments} of commentsIterator) {
    const existingComment = comments.find(comment =>
      comment.body?.includes(commentBodyIncludes)
    )
    if (existingComment) return existingComment.id
  }

  return undefined
}

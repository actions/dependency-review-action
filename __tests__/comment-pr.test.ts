import {beforeEach, describe, expect, jest, test} from '@jest/globals'
import {ConfigurationOptions} from '../src/schemas'

// The octokit client is instantiated at module load in comment-pr.ts, so the
// mock for @actions/github/lib/utils must expose a stable mock client that both
// the module and the tests can reach.
const octoMock = {
  rest: {
    issues: {
      updateComment: jest.fn(),
      createComment: jest.fn(),
      listComments: jest.fn()
    }
  },
  paginate: {
    iterator: jest.fn()
  }
}

jest.mock('@actions/github/lib/utils', () => ({
  GitHub: {
    plugin: () =>
      function () {
        return octoMock
      }
  },
  getOctokitOptions: jest.fn(() => ({}))
}))

jest.mock('@actions/github', () => ({
  context: {
    payload: {pull_request: {number: 123}},
    repo: {owner: 'owner', repo: 'repo'}
  }
}))

jest.mock('@actions/core', () => ({
  getInput: jest.fn(() => 'token'),
  warning: jest.fn()
}))

import {commentPr} from '../src/comment-pr'

const EXISTING_COMMENT_ID = 456
const MARKER = '<!-- dependency-review-pr-comment-marker -->'

function config(
  comment_summary_in_pr: ConfigurationOptions['comment_summary_in_pr']
): ConfigurationOptions {
  return {comment_summary_in_pr} as ConfigurationOptions
}

// Makes paginate.iterator yield a single page of comments.
function mockExistingComments(comments: {id: number; body: string}[]): void {
  octoMock.paginate.iterator.mockReturnValue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async *[Symbol.asyncIterator](): any {
      yield {data: comments}
    }
  } as never)
}

describe('commentPr', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExistingComments([])
  })

  describe("when comment_summary_in_pr is 'never'", () => {
    test('does not create or update a comment', async () => {
      await commentPr('summary', config('never'), true)

      expect(octoMock.rest.issues.createComment).not.toHaveBeenCalled()
      expect(octoMock.rest.issues.updateComment).not.toHaveBeenCalled()
    })
  })

  describe("when comment_summary_in_pr is 'always'", () => {
    test('creates a comment when none exists', async () => {
      await commentPr('summary', config('always'), false)

      expect(octoMock.rest.issues.createComment).toHaveBeenCalledTimes(1)
      expect(octoMock.rest.issues.updateComment).not.toHaveBeenCalled()
    })

    test('updates the existing comment when one exists', async () => {
      mockExistingComments([{id: EXISTING_COMMENT_ID, body: MARKER}])

      await commentPr('summary', config('always'), false)

      expect(octoMock.rest.issues.updateComment).toHaveBeenCalledTimes(1)
      expect(octoMock.rest.issues.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({comment_id: EXISTING_COMMENT_ID})
      )
      expect(octoMock.rest.issues.createComment).not.toHaveBeenCalled()
    })
  })

  describe("when comment_summary_in_pr is 'on-failure'", () => {
    test('creates a comment when an issue is found and none exists', async () => {
      await commentPr('summary', config('on-failure'), true)

      expect(octoMock.rest.issues.createComment).toHaveBeenCalledTimes(1)
    })

    test('updates the existing comment when an issue is found', async () => {
      mockExistingComments([{id: EXISTING_COMMENT_ID, body: MARKER}])

      await commentPr('summary', config('on-failure'), true)

      expect(octoMock.rest.issues.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({comment_id: EXISTING_COMMENT_ID})
      )
      expect(octoMock.rest.issues.createComment).not.toHaveBeenCalled()
    })

    test('updates the existing comment when issues have cleared', async () => {
      mockExistingComments([{id: EXISTING_COMMENT_ID, body: MARKER}])

      await commentPr('summary', config('on-failure'), false)

      expect(octoMock.rest.issues.updateComment).toHaveBeenCalledTimes(1)
      expect(octoMock.rest.issues.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({comment_id: EXISTING_COMMENT_ID})
      )
      expect(octoMock.rest.issues.createComment).not.toHaveBeenCalled()
    })

    test('does not create a comment when no issue is found and none exists', async () => {
      await commentPr('summary', config('on-failure'), false)

      expect(octoMock.rest.issues.createComment).not.toHaveBeenCalled()
      expect(octoMock.rest.issues.updateComment).not.toHaveBeenCalled()
    })
  })
})

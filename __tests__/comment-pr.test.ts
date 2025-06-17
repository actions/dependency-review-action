import {expect, test, beforeEach} from '@jest/globals'

// Mock GitHub Actions modules before importing anything else
jest.mock('@actions/github')
jest.mock('@actions/core')

// Create mocks that will be available throughout the module
const createCommentMock = jest.fn()
const updateCommentMock = jest.fn()
const listCommentsMock = jest.fn()
const paginateIteratorMock = jest.fn()

// Mock the octokit instance creation
jest.mock('@actions/github/lib/utils', () => ({
  GitHub: {
    plugin: jest.fn(() =>
      jest.fn(() => ({
        rest: {
          issues: {
            createComment: createCommentMock,
            updateComment: updateCommentMock,
            listComments: listCommentsMock
          }
        },
        paginate: {
          iterator: paginateIteratorMock
        }
      }))
    )
  },
  getOctokitOptions: jest.fn(() => ({}))
}))

jest.mock('@octokit/plugin-retry', () => ({
  retry: {}
}))

// Now import the modules that use the mocks
import {commentPr} from '../src/comment-pr'
import {ConfigurationOptions} from '../src/schemas'
import * as github from '@actions/github'
import * as core from '@actions/core'

const mockGithub = github as jest.Mocked<typeof github>
const mockCore = core as jest.Mocked<typeof core>

const defaultConfig: ConfigurationOptions = {
  comment_summary_in_pr: 'on-failure',
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  allow_licenses: [],
  deny_licenses: [],
  allow_dependencies_licenses: [],
  allow_ghsas: [],
  license_check: true,
  vulnerability_check: true,
  warn_only: false,
  show_openssf_scorecard: false,
  warn_on_openssf_scorecard_level: 3,
  retry_on_snapshot_warnings: false,
  retry_on_snapshot_warnings_timeout: 120,
  base_ref: '',
  head_ref: '',
  deny_packages: [],
  deny_groups: []
}

beforeEach(() => {
  jest.clearAllMocks()

  // Setup GitHub context
  Object.defineProperty(mockGithub, 'context', {
    value: {
      repo: {owner: 'test-owner', repo: 'test-repo'},
      payload: {pull_request: {number: 123}}
    },
    writable: true
  })

  mockCore.getInput.mockReturnValue('mock-token')

  // Setup default mock returns
  createCommentMock.mockResolvedValue({data: {id: 1}})
  updateCommentMock.mockResolvedValue({data: {id: 1}})
  listCommentsMock.mockResolvedValue({data: []})
  paginateIteratorMock.mockReturnValue([{data: []}])
})

test('commentPr creates comment in always mode regardless of issues', async () => {
  const config = {...defaultConfig, comment_summary_in_pr: 'always' as const}

  await commentPr('Test content', config, false)

  expect(createCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: 123,
    body: 'Test content\n\n<!-- dependency-review-pr-comment-marker -->'
  })
  expect(updateCommentMock).not.toHaveBeenCalled()
})

test('commentPr creates comment in on-failure mode when issues found', async () => {
  const config = {
    ...defaultConfig,
    comment_summary_in_pr: 'on-failure' as const
  }

  await commentPr('Issues found', config, true)

  expect(createCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    issue_number: 123,
    body: 'Issues found\n\n<!-- dependency-review-pr-comment-marker -->'
  })
  expect(updateCommentMock).not.toHaveBeenCalled()
})

test('commentPr does not comment in never mode', async () => {
  const config = {...defaultConfig, comment_summary_in_pr: 'never' as const}

  await commentPr('Test content', config, false)

  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).not.toHaveBeenCalled()
})

test('commentPr does not comment in on-failure mode when no issues and no existing comment', async () => {
  const config = {
    ...defaultConfig,
    comment_summary_in_pr: 'on-failure' as const
  }

  await commentPr('No issues', config, false)

  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).not.toHaveBeenCalled()
})

test('commentPr updates existing comment in on-failure mode when no issues but comment exists', async () => {
  const config = {
    ...defaultConfig,
    comment_summary_in_pr: 'on-failure' as const
  }

  // Mock existing comment
  const existingComment = {
    id: 456,
    body: 'Previous issues\n\n<!-- dependency-review-pr-comment-marker -->'
  }
  paginateIteratorMock.mockReturnValue([{data: [existingComment]}])

  await commentPr('Issues resolved', config, false)

  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    comment_id: 456,
    body: 'Issues resolved\n\n<!-- dependency-review-pr-comment-marker -->'
  })
})

test('commentPr updates existing comment instead of creating new one in always mode', async () => {
  const config = {...defaultConfig, comment_summary_in_pr: 'always' as const}

  // Mock existing comment
  const existingComment = {
    id: 789,
    body: 'Old content\n\n<!-- dependency-review-pr-comment-marker -->'
  }
  paginateIteratorMock.mockReturnValue([{data: [existingComment]}])

  await commentPr('Updated content', config, false)

  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    comment_id: 789,
    body: 'Updated content\n\n<!-- dependency-review-pr-comment-marker -->'
  })
})

test('commentPr finds comment marker among multiple comments', async () => {
  const config = {...defaultConfig, comment_summary_in_pr: 'always' as const}

  // Mock multiple comments with marker in the middle
  const comments = [
    {id: 1, body: 'Regular comment'},
    {id: 2, body: 'Another comment'},
    {
      id: 3,
      body: 'Target comment\n\n<!-- dependency-review-pr-comment-marker -->'
    },
    {id: 4, body: 'Last comment'}
  ]
  paginateIteratorMock.mockReturnValue([{data: comments}])

  await commentPr('Updated content', config, false)

  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).toHaveBeenCalledWith({
    owner: 'test-owner',
    repo: 'test-repo',
    comment_id: 3,
    body: 'Updated content\n\n<!-- dependency-review-pr-comment-marker -->'
  })
})

test('commentPr handles non-PR context gracefully', async () => {
  Object.defineProperty(mockGithub, 'context', {
    value: {
      repo: {owner: 'test-owner', repo: 'test-repo'},
      payload: {}
    },
    writable: true
  })

  const config = {...defaultConfig, comment_summary_in_pr: 'always' as const}

  await commentPr('Test content', config, false)

  expect(mockCore.warning).toHaveBeenCalledWith(
    'Not in the context of a pull request. Skipping comment creation.'
  )
  expect(createCommentMock).not.toHaveBeenCalled()
  expect(updateCommentMock).not.toHaveBeenCalled()
})

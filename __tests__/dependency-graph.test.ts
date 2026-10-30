import {RequestError} from '@octokit/request-error'
import * as dependencyGraph from '../src/dependency-graph'
import * as core from '@actions/core'

// mock call to core.getInput('repo-token'.. to avoid environment setup - Input required and not supplied: repo-token
jest.mock('@actions/core', () => ({
  getInput: (input: string) => {
    if (input === 'repo-token') {
      return 'gh_testtoken'
    }
  }
}))

test('it properly catches RequestError type', async () => {
  const token = core.getInput('repo-token', {required: true})
  expect(token).toBe('gh_testtoken')

  //Integration test to make an API request using current dependencies and ensure response can parse into RequestError
  try {
    await dependencyGraph.compare({
      owner: 'actions',
      repo: 'dependency-review-action',
      baseRef: 'refs/heads/master',
      headRef: 'refs/heads/master'
    })
  } catch (error) {
    expect(error).toBeInstanceOf(RequestError)
  }
})
test('comparison page size stays within API limits', () => {
  const sizes = Array.from({length: 97}, (_, attempt) =>
    dependencyGraph.getComparisonPageSize(attempt)
  )

  expect(sizes[0]).toBe(5)
  expect(sizes[1]).toBe(6)
  expect(sizes[95]).toBe(100)
  expect(sizes[96]).toBe(5)
  expect(new Set(sizes.slice(0, 96)).size).toBe(96)
})

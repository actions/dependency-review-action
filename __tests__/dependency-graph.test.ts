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

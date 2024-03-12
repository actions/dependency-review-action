import {expect, jest, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {getScorecardLevels, getProjectUrl} from '../src/scorecard'

const npmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'type-is',
  version: '1.6.18',
  package_url: 'pkg:npm/type-is@1.6.18',
  license: 'MIT',
  source_repository_url: 'github.com/jshttp/type-is',
  scope: 'runtime',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'first-random_string',
      advisory_summary: 'very dangerous',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

test('Get scorecard from API', async () => {
  const changes: Changes = [npmChange]
  const scorecard = await getScorecardLevels(changes)
  expect(scorecard).not.toBeNull()
  expect(scorecard.dependencies).toHaveLength(1)
  expect(scorecard.dependencies[0].scorecard?.score).toBeGreaterThan(0)
})

test('Get project URL from deps.dev API', async () => {
  const result = await getProjectUrl(
    npmChange.ecosystem,
    npmChange.name,
    npmChange.version
  )
  expect(result).not.toBeNull()
})

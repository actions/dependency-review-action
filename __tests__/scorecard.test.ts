import {expect, jest, test} from '@jest/globals'
import {Change, Changes, Scorecard} from '../src/schemas'
import {getScorecardLevels} from '../src/scorecard'

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

test('Can download data from deps.dev', async () => {
  const changes: Changes = [npmChange]
  const scorecard = await getScorecardLevels(changes)
  expect(scorecard).not.toBeNull()
})

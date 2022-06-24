import {expect, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {filterChangesBySeverity} from '../src/filter'

let npmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'Reeuhq',
  version: '1.0.2',
  package_url: 'pkg:npm/reeuhq@1.0.2',
  license: 'MIT',
  source_repository_url: 'github.com/some-repo',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'first-random_string',
      advisory_summary: 'very dangerouns',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

let rubyChange: Change = {
  change_type: 'added',
  manifest: 'Gemfile.lock',
  ecosystem: 'rubygems',
  name: 'actionsomething',
  version: '3.2.0',
  package_url: 'pkg:gem/actionsomething@3.2.0',
  license: 'BSD-2-Clause',
  source_repository_url: 'github.com/some-repo',
  vulnerabilities: [
    {
      severity: 'moderate',
      advisory_ghsa_id: 'second-random_string',
      advisory_summary: 'not so dangerouns',
      advisory_url: 'github.com/future-funk'
    },
    {
      severity: 'low',
      advisory_ghsa_id: 'third-random_string',
      advisory_summary: 'dont page me',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

test('it properly filters changes by severity', async () => {
  const changes = [npmChange, rubyChange]
  let result = filterChangesBySeverity('high', changes)
  expect(result).toEqual([npmChange])

  result = filterChangesBySeverity('low', changes)
  expect(changes).toEqual([npmChange, rubyChange])

  result = filterChangesBySeverity('critical', changes)
  expect(changes).toEqual([npmChange, rubyChange])
})

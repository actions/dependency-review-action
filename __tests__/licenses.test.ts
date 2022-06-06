import {expect, test} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {hasInvalidLicenses} from '../src/licenses'

let npmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'Reeuhq',
  version: '1.0.2',
  package_url: 'somepurl',
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
  package_url: 'somerubypurl',
  license: 'BSD',
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

test('hasInvalidLicenses fails a licenses outside the allow list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const result = hasInvalidLicenses(changes, ['BSD'], [])
  expect(result[0]).toBe(npmChange)
})

test('hasInvalidLicenses fails if a denied license is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const result = hasInvalidLicenses(changes, [], ['BSD'])
  expect(result[0]).toBe(rubyChange)
})

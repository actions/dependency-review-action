import {expect, test, describe} from '@jest/globals'
import {Change, Changes} from '../src/schemas'
import {getDeniedLicenseChanges, isSpdxId} from '../src/licenses'

describe('isSpdxId', () => {
  test('it returns true for known SPDX ID even if it has been deprecated', () => {
    expect(isSpdxId('GPL-3.0+')).toBe(true)
  })

  test('it returns true for known SPDX ID conjunction', () => {
    expect(isSpdxId('GPL-3.0-or-later OR MIT')).toBe(true)
  })

  test('it returns false for unknown SPDX ID', () => {
    expect(isSpdxId('GPL-3')).toBe(false)
  })
})

let npmChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'Reeuhq',
  version: '1.0.2',
  package_url: 'pkg:npm/reeuhq@1.0.2',
  license: 'CC0-1.0 OR MIT OR (CC0-1.0 AND MIT)',
  source_repository_url: 'github.com/some-repo',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'first-random_string',
      advisory_summary: 'very dangerous',
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
      advisory_summary: 'not so dangerous',
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

const nullLicense: Change = {...rubyChange, name: 'nullLicense', license: null}
const unknownLicense: Change = {
  ...rubyChange,
  name: 'unknownLicense',
  license: 'THIS-LICENSE-IS-NOT-DEFINED-IN-SPDX'
}

test('it passes if a license inside the allow list is found', async () => {
  const changes: Changes = [npmChange]
  const [invalidChanges, _] = getDeniedLicenseChanges(changes, {allow: ['MIT']})
  expect(invalidChanges.length).toBe(0)
})

test('it fails if a license outside the allow list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges, unknownLicenses] = getDeniedLicenseChanges(changes, {
    allow: ['BSD-2-Clause']
  })
  expect(invalidChanges).toStrictEqual([npmChange])
  expect(unknownLicenses).toStrictEqual([])
})

test('it passes if license outside at least one of deny list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges] = getDeniedLicenseChanges(changes, {deny: ['MIT']})
  expect(invalidChanges.length).toBe(0)
})

test('it fails if a license inside the deny list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges] = getDeniedLicenseChanges(changes, {
    deny: ['BSD-2-Clause']
  })
  expect(invalidChanges).toStrictEqual([rubyChange])
})

test.skip('it fails if a multiple license inside the all of deny list is found', async () => {
  const changes: Changes = [npmChange, rubyChange]
  const [invalidChanges] = getDeniedLicenseChanges(changes, {
    deny: ['MIT', 'CC0-1.0']
  })
  expect(invalidChanges).toStrictEqual([npmChange])
})

// This is more of a "here's a behavior that might be surprising" than an actual
// thing we want in the system. Please remove this test after refactoring.
test('it fails all license checks when allow is provided an empty array', async () => {
  const changes: Changes = [npmChange, rubyChange]
  let [invalidChanges, _] = getDeniedLicenseChanges(changes, {
    allow: [],
    deny: ['BSD-2-Clause']
  })
  expect(invalidChanges.length).toBe(2)
})

test('it detects unknown licenses', async () => {
  const changes: Changes = [nullLicense, unknownLicense]
  const [_, unknownLicenses] = getDeniedLicenseChanges(changes, {
    allow: ['MIT']
  })
  expect(unknownLicenses.sort()).toStrictEqual([nullLicense, unknownLicense])
})

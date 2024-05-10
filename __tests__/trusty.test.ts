import {expect, test} from '@jest/globals'
import {
  Change,
  Changes,
  ConfigurationOptions,
  ConfigurationOptionsSchema
} from '../src/schemas'
import {getTrustyScores} from '../src/trusty'

const nonExistChange: Change = {
  manifest: 'package.json',
  change_type: 'added',
  ecosystem: 'npm',
  name: 'xxxx',
  version: '1.6.18',
  package_url: 'pkg:npm/type-is@1.6.18',
  license: 'MIT',
  source_repository_url: 'github.com/jshttp/type-is',
  scope: 'runtime',
  vulnerabilities: []
}

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

const pipChange: Change = {
  change_type: 'added',
  manifest: 'requirements.txt',
  ecosystem: 'pip',
  name: 'pandas',
  version: '1.1.1',
  package_url: 'pkg:pypi/pandas@1.1.1',
  license: 'MIT',
  source_repository_url: 'github.com/some-repo',
  scope: 'runtime',
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

const mavenChange: Change = {
  change_type: 'added',
  manifest: 'pom.xml',
  ecosystem: 'maven',
  name: 'org.apache.logging.log4j:log4j-core',
  version: '2.15.0',
  package_url: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.7',
  license: 'Apache-2.0',
  source_repository_url:
    'https://mvnrepository.com/artifact/org.apache.logging.log4j/log4j-core',
  scope: 'unknown',
  vulnerabilities: [
    {
      severity: 'critical',
      advisory_ghsa_id: 'second-random_string',
      advisory_summary: 'not so dangerous',
      advisory_url: 'github.com/future-funk'
    }
  ]
}

const config: ConfigurationOptions = ConfigurationOptionsSchema.parse({
  trusty_retries: 2
})

test('Test npm', async () => {
  const changes: Changes = [npmChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

test('Test pypi', async () => {
  const changes: Changes = [pipChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

test('Test maven', async () => {
  const changes: Changes = [mavenChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

test('Test non-existent', async () => {
  const changes: Changes = [nonExistChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

test('Test good list', async () => {
  const changes: Changes = [npmChange, pipChange, mavenChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

test('Test bad list', async () => {
  const changes: Changes = [npmChange, pipChange, mavenChange, nonExistChange]
  const changed = await getTrustyScores(changes, config)
  expect(changed[0]).not.toBeNull()
  expect(changed).toHaveLength(changes.length)
  expect(changed[0].trusty?.score).toBeGreaterThan(0)
})

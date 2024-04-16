import {PackageURL} from 'packageurl-js'
import {Change} from '../../src/schemas'
import {createTestVulnerability} from './create-test-vulnerability'
import {parsePURL} from '../../src/utils'

const defaultNpmChange: Change = {
  change_type: 'added',
  manifest: 'package.json',
  ecosystem: 'npm',
  name: 'lodash',
  version: '4.17.20',
  package_url: 'pkg:npm/lodash@4.17.20',
  license: 'MIT',
  source_repository_url: 'https://github.com/lodash/lodash',
  scope: 'runtime',
  vulnerabilities: [
    createTestVulnerability({
      severity: 'high',
      advisory_ghsa_id: 'GHSA-35jh-r3h4-6jhm',
      advisory_summary: 'Command Injection in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm'
    }),
    createTestVulnerability({
      severity: 'moderate',
      advisory_ghsa_id: 'GHSA-29mw-wpgm-hmr9',
      advisory_summary:
        'Regular Expression Denial of Service (ReDoS) in lodash',
      advisory_url: 'https://github.com/advisories/GHSA-29mw-wpgm-hmr9'
    })
  ]
}

const defaultRubyChange: Change = {
  change_type: 'added',
  manifest: 'Gemfile.lock',
  ecosystem: 'rubygems',
  name: 'actionsomething',
  version: '3.2.0',
  package_url: 'pkg:gem/actionsomething@3.2.0',
  license: 'BSD',
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

const defaultPipChange: Change = {
  change_type: 'added',
  manifest: 'requirements.txt',
  ecosystem: 'pip',
  name: 'package-1',
  version: '1.1.1',
  package_url: 'pkg:pypi/package-1@1.1.1',
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

const defaultMavenChange: Change = {
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

const ecosystemToDefaultChange: {[key: string]: Change} = {
  npm: defaultNpmChange,
  rubygems: defaultRubyChange,
  pip: defaultPipChange,
  maven: defaultMavenChange
}

const createTestChange = (overwrites: Partial<Change> = {}): Change => {
  const ecosystem = overwrites.ecosystem || 'npm'
  return {
    ...ecosystemToDefaultChange[ecosystem],
    ...overwrites
  }
}

const createTestPURLs = (list: string[]): PackageURL[] => {
  return list.map(purl => {
    return parsePURL(purl)
  })
}

export {createTestChange, createTestPURLs}

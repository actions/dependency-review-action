import {Change} from '../../src/schemas'
import {createTestVulnerability} from './create-test-vulnerability'

const defaultChange: Change = {
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

const createTestChange = (overwrites: Partial<Change> = {}): Change => ({
  ...defaultChange,
  ...overwrites
})

export {createTestChange}

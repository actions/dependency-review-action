import {expect, jest, test} from '@jest/globals'
import {Change, Changes, ConfigurationOptions} from '../src/schemas'
import * as summary from '../src/summary';
import * as core from '@actions/core';
import { createTestChange } from './fixtures/mock-change';


afterEach(() => {
  jest.clearAllMocks();
  core.summary.emptyBuffer();
});

const emptyChanges: Changes = [];
const emptyInvalidLicenseChanges = {
  forbidden: [],
  unresolved: [],
  unlicensed: []
};
const defaultConfig: ConfigurationOptions = {
  vulnerability_check: true,
  license_check: true,
  fail_on_severity: 'high',
  fail_on_scopes: ['runtime'],
  allow_ghsas: [],
  allow_licenses: [],
  deny_licenses: [],
  comment_summary_in_pr: true,
}

test('prints headline as h2', () => {
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, defaultConfig);
  const text = core.summary.stringify();
  
  expect(text).toContain('<h2>Dependency Review</h2>');
});

test('only includes "No vulnerabilities or license issues found"-message if both are configured and nothing was found', () => {
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, defaultConfig);
  const text = core.summary.stringify();
  
  expect(text).toContain('✅ No vulnerabilities or license issues found.');
});

test('only includes "No vulnerabilities found"-message if "license_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, license_check: false};
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, config);
  const text = core.summary.stringify();
  
  expect(text).toContain('✅ No vulnerabilities found.');
});

test('only includes "No license issues found"-message if "vulnerability_check" is set to false and nothing was found', () => {
  const config = {...defaultConfig, vulnerability_check: false};
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, config);
  const text = core.summary.stringify();
  
  expect(text).toContain('✅ No license issues found.');
});

test('does not include status section if nothing was found', () => {
  summary.addSummaryToSummary(emptyChanges, emptyInvalidLicenseChanges, defaultConfig);
  const text = core.summary.stringify();
  
  expect(text).not.toContain('The following issues were found:');
});


test('includes count and status icons for all findings', () => {
  const vulnerabilities = [
    createTestChange({ name: 'lodash'}),
    createTestChange({ name: 'underscore', package_url: 'test-url'}),
  ];
  const licenseIssues = {
    forbidden: [createTestChange()],
    unresolved: [createTestChange(), createTestChange()],
    unlicensed: [createTestChange(), createTestChange(), createTestChange()],
  };
  
  summary.addSummaryToSummary(vulnerabilities, licenseIssues, defaultConfig);
  
  const text = core.summary.stringify();
  expect(text).toContain('❌ 2 vulnerable package(s)');
  expect(text).toContain('❌ 2 package(s) with invalid SPDX license definitions');
  expect(text).toContain('❌ 1 package(s) with incompatible licenses');
  expect(text).toContain('⚠️ 3 package(s) with unknown licenses');
});

test('uses checkmarks for license issues if only vulnerabilities were found', () => {
  const vulnerabilities = [ createTestChange() ];
  
  summary.addSummaryToSummary(vulnerabilities, emptyInvalidLicenseChanges, defaultConfig);
  
  const text = core.summary.stringify();
  expect(text).toContain('❌ 1 vulnerable package(s)');
  expect(text).toContain('✅ 0 package(s) with invalid SPDX license definitions');
  expect(text).toContain('✅ 0 package(s) with incompatible licenses');
  expect(text).toContain('✅ 0 package(s) with unknown licenses');
});

test('uses checkmarks for vulnerabilities if only license issues were found.', () => {
  const licenseIssues = { forbidden: [createTestChange()], unresolved: [], unlicensed: [] };
  
  summary.addSummaryToSummary(emptyChanges, licenseIssues, defaultConfig);
  
  const text = core.summary.stringify();
  expect(text).toContain('✅ 0 vulnerable package(s)');
  expect(text).toContain('✅ 0 package(s) with invalid SPDX license definitions');
  expect(text).toContain('❌ 1 package(s) with incompatible licenses');
  expect(text).toContain('✅ 0 package(s) with unknown licenses');
});

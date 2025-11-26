# Testing the Resolved Vulnerabilities Feature

This guide explains how to test the new resolved vulnerabilities feature in a real repository.

## Option 1: Test in a Fork (Recommended)

1. **Fork this repository** to your GitHub account
2. **Build the action**:
   ```bash
   npm install
   npm run build
   npm run package
   ```
3. **Commit the built files** (especially `dist/` directory)
4. **Create a test repository** with vulnerable dependencies
5. **Set up the workflow** to use your fork

### Example Test Repository Setup

Create a new repository with these files:

**package.json** (with known vulnerable packages):
```json
{
  "name": "test-resolved-vulnerabilities",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.20",
    "axios": "0.21.0",
    "moment": "2.29.1"
  }
}
```

**.github/workflows/dependency-review.yml**:
```yaml
name: 'Test Resolved Vulnerabilities'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v4
      - name: 'Dependency Review'
        id: review
        uses: YOUR-USERNAME/dependency-review-action@main  # Your fork
        with:
          fail-on-severity: critical
          comment-summary-in-pr: always
      - name: 'Check Resolved Vulnerabilities'
        env:
          RESOLVED_VULNERABILITIES: ${{ steps.review.outputs.resolved-vulnerabilities }}
        run: |
          echo "Resolved vulnerabilities:"
          echo "$RESOLVED_VULNERABILITIES" | jq '.'
```

### Testing Process

1. **Create a PR that removes vulnerable packages**:
   - Remove or upgrade `lodash`, `axios`, or `moment`
   - The action should detect resolved vulnerabilities
   
2. **Check the outputs**:
   - PR comment should show "🎉 Vulnerabilities Resolved" section
   - Job summary should include resolved vulnerabilities table
   - Action logs should show resolved vulnerabilities

## Option 2: Test Locally with Act

Use [act](https://github.com/nektos/act) to test GitHub Actions locally:

1. **Install act**:
   ```bash
   # macOS
   brew install act
   ```

2. **Create test files** in a temporary directory:
   ```bash
   mkdir test-resolved-vulns
   cd test-resolved-vulns
   git init
   ```

3. **Set up test scenario**:
   ```bash
   # Create initial commit with vulnerable dependencies
   echo '{"dependencies": {"lodash": "4.17.20"}}' > package.json
   git add package.json
   git commit -m "Add vulnerable dependency"
   
   # Create branch with fix
   git checkout -b fix-vulnerabilities
   echo '{"dependencies": {"lodash": "4.17.21"}}' > package.json
   git add package.json
   git commit -m "Upgrade lodash to fix vulnerabilities"
   ```

4. **Run with act**:
   ```bash
   act pull_request --container-architecture linux/amd64
   ```

## Option 3: Test in GitHub Codespaces

1. **Open this repository in Codespaces**
2. **Make your changes and build**:
   ```bash
   npm run build && npm run package
   ```
3. **Create a test branch** with vulnerable dependencies
4. **Open a PR** and watch the action run

## Option 4: Use the Test Repository Template

I'll create a template repository for easy testing:

**Create `test-repository-template/`** with:

```bash
# package.json with multiple vulnerable packages
{
  "name": "vulnerability-test-repo",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.20",        # CVE-2021-23337
    "axios": "0.21.0",          # CVE-2021-3749
    "moment": "2.29.1",         # No vulnerabilities (for contrast)
    "trim-newlines": "3.0.0"    # CVE-2021-33623
  },
  "devDependencies": {
    "node-fetch": "2.6.1"      # CVE-2022-0235
  }
}
```

## Expected Test Results

When testing, you should see:

### ✅ In PR Comments:
```
🎉 **2 vulnerabilities resolved** by removing or upgrading packages:

| Severity | Package | Advisory | 
|----------|---------|----------|
| High | lodash@4.17.20 | Prototype Pollution |
| Moderate | axios@0.21.0 | SSRF vulnerability |
```

### ✅ In Action Outputs:
```bash
echo "${{ steps.review.outputs.resolved-vulnerabilities }}" | jq '.'
```
Should return JSON array with vulnerability details.

### ✅ In Job Summary:
- Green checkmarks for resolved vulnerabilities
- Detailed table with severity levels
- Positive messaging

## Troubleshooting

**Action doesn't run**: Ensure you've built and packaged the action (`npm run package`)

**No resolved vulnerabilities detected**: 
- Check that you're removing packages that actually have vulnerabilities
- Verify the base branch has the vulnerable packages
- Check that the dependency-graph API returns vulnerability data

**Permission issues**: Ensure the workflow has `contents: read` and `pull-requests: write` permissions

**API rate limits**: Use a personal access token if testing frequently

## Advanced Testing

For more comprehensive testing:

1. **Test different package managers** (npm, pip, Maven, etc.)
2. **Test different vulnerability severities** (critical, high, moderate, low)
3. **Test edge cases** (empty removals, no vulnerabilities, etc.)
4. **Test with large dependency changes** (many packages removed)

## Cleanup

After testing, remember to:
- Delete test repositories
- Remove any personal access tokens created for testing
- Clean up any forks if no longer needed
# Quick Test Setup

## Method 1: Fork and Test (Easiest)

1. **Fork this repository** to your GitHub account
2. **Create a test repository** with this structure:

### Test Repository Files

**package.json** (vulnerable dependencies):
```json
{
  "name": "test-resolved-vulns",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.20",
    "axios": "0.21.0"
  }
}
```

**.github/workflows/test-resolved-vulns.yml**:
```yaml
name: 'Test Resolved Vulnerabilities'
on:
  pull_request:
    branches: [ main ]

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
        uses: YOUR-USERNAME/dependency-review-action@main  # Replace with your fork
        with:
          fail-on-severity: critical
          comment-summary-in-pr: always
          
      - name: 'Show Resolved Vulnerabilities'
        if: steps.review.outputs.resolved-vulnerabilities != '[]'
        env:
          RESOLVED_VULNERABILITIES: ${{ steps.review.outputs.resolved-vulnerabilities }}
        run: |
          echo "🎉 Resolved vulnerabilities found!"
          echo "$RESOLVED_VULNERABILITIES" | jq '.[] | "- \(.severity | ascii_upcase): \(.advisory_summary) in \(.package_name)@\(.package_version)"'
          
      - name: 'No Resolved Vulnerabilities'
        if: steps.review.outputs.resolved-vulnerabilities == '[]'
        run: |
          echo "ℹ️ No vulnerabilities were resolved in this change."
```

### Test Process

1. **Initial commit**: Commit the vulnerable `package.json`
2. **Create PR**: 
   - Create a new branch
   - Update package.json to remove or upgrade vulnerable packages:
   ```json
   {
     "name": "test-resolved-vulns", 
     "version": "1.0.0",
     "dependencies": {
       "lodash": "4.17.21"
     }
   }
   ```
   - Open a PR

3. **Check Results**: You should see:
   - ✅ Positive feedback in PR comment about resolved vulnerabilities
   - ✅ Detailed vulnerability information in action logs
   - ✅ Job summary showing resolved vulnerabilities table

## Method 2: Test Locally

If you want to test the logic locally before pushing:

```bash
# Install dependencies  
npm install

# Run tests to verify functionality
npm test -- --testPathPattern="resolved-vulnerabilities"

# Build and package
npm run build && npm run package

# The packaged action is now in dist/ directory
```

## Expected Output Example

When you remove `lodash@4.17.20`, you should see output like:

```
🎉 **1 vulnerability resolved** by removing or upgrading packages:

| Package | Version | Severity | Advisory |
|---------|---------|----------|----------|
| lodash | 4.17.20 | High | Prototype Pollution vulnerability |

Great job improving your project's security! 🔒
```

## Troubleshooting

- **No vulnerabilities detected**: Make sure the base branch actually has packages with known vulnerabilities
- **Action fails**: Check that your fork has the latest built `dist/` directory committed
- **Permission errors**: Ensure your workflow has the correct permissions set
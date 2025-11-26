# Resolved Vulnerabilities Example

This example shows how to access the new `resolved-vulnerabilities` output from the Dependency Review Action:

```yaml
name: 'Dependency Review with Resolved Vulnerabilities'
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
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
      - name: 'Celebrate Resolved Vulnerabilities'
        if: steps.review.outputs.resolved-vulnerabilities != '[]'
        env:
          RESOLVED_VULNERABILITIES: ${{ steps.review.outputs.resolved-vulnerabilities }}
        run: |
          echo "Great job! This PR resolves vulnerabilities:"
          echo "$RESOLVED_VULNERABILITIES" | jq -r '.[] | "✅ \(.package_name)@\(.package_version) - \(.advisory_summary)"'
```

## Output Format

The `resolved-vulnerabilities` output contains a JSON array of resolved vulnerability objects:

```json
[
  {
    "severity": "high",
    "advisory_ghsa_id": "GHSA-35jh-r3h4-6jhm",
    "advisory_summary": "lodash Prototype Pollution vulnerability",
    "advisory_url": "https://github.com/advisories/GHSA-35jh-r3h4-6jhm",
    "package_name": "lodash",
    "package_version": "4.17.20",
    "package_url": "pkg:npm/lodash@4.17.20",
    "manifest": "package.json",
    "ecosystem": "npm"
  }
]
```

Each resolved vulnerability object contains:
- `severity`: The severity level of the vulnerability (critical, high, moderate, low)
- `advisory_ghsa_id`: The GitHub Security Advisory identifier
- `advisory_summary`: A brief description of the vulnerability
- `advisory_url`: Link to the full advisory
- `package_name`: Name of the package that had the vulnerability
- `package_version`: Version of the package that was removed/upgraded
- `package_url`: Package URL in PURL format
- `manifest`: The manifest file containing the dependency
- `ecosystem`: The package ecosystem (npm, pip, maven, etc.)
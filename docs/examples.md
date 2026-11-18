# Examples of how to use the Dependency Review Action

## Basic Usage

A very basic example of how to use the action. This will run the action with the default configuration.

See the [full list of configuration options](../README.md#configuration-options).

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
```

## Using an inline configuration

The following example will fail the action if any vulnerabilities are found with a severity of medium or higher; and if any packages are found with an incompatible license - in this case, the LGPL-2.0 and BSD-2-Clause licenses.

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
```

## Warning while patched releases are in cooldown

Package feeds can hold new releases before making them available. To avoid
requiring a fix that is still in that release-age window, opt in to a vulnerability
cooldown:

```yaml
- name: 'Dependency Review'
  uses: actions/dependency-review-action@v5
  with:
    warn-on-vulnerability-cooldown: 7
```

The value is a number of 24-hour days from the patched release's publication,
not the advisory's publication or the workflow's first run. It applies to all
severities that meet `fail-on-severity`, including critical vulnerabilities.
Findings remain in the logs, summary, and `vulnerable-changes` output. Warnings
and the summary show the expiry time; reruns at or after that time fail normally.
Expiry is evaluated when the action runs; it does not schedule another check.

Release dates are obtained from deps.dev for Cargo, Go, Maven, npm, NuGet, PyPI,
and RubyGems, using package names and patched versions from public GitHub
advisories. GitHub credentials are not sent to deps.dev. Every first-patched
version listed for the package must have a verifiable date inside the window;
an older fix on another release branch prevents cooldown. Missing fixes,
unsupported ecosystems, API failures, and missing, invalid, or future release
dates leave normal vulnerability enforcement unchanged. GitHub Enterprise
Server is not supported. Cooldown lookups share a 30-second budget. Findings
that have not been verified by then still block, as do cooldowns that have
expired by the time the action makes its enforcement decision.

The default is `0` (disabled). License checks and package/group deny lists are
unaffected. This setting estimates a release-age window, not the availability
of a version in a particular feed. Global `warn-only: true` takes precedence.

## Using a configuration file

The following example will use a configuration file to configure the action. This is useful if you want to keep your configuration in a single place and makes it easier to manage as the configuration grows.

The configuration file can be located in the same repository or in a separate repository. Having it in a separate repository might be useful if you plan to use the same configuration across multiple repositories and control it centrally.

In this example, the configuration file is located in the same repository under `.github/dependency-review-config.yml`. The following configuration will fail the action if any vulnerabilities are found with a severity of critical; and if any packages are found with an incompatible license - in this case, the LGPL-2.0 and BSD-2-Clause licenses.

```yaml
fail_on_severity: 'critical'
allow_licenses:
  - 'LGPL-2.0'
  - 'BSD-2-Clause'
```

The Dependency Review Action workflow file will then look like this:

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          config-file: './.github/dependency-review-config.yml'
```

## Using a configuration file from an external repository

The following example will use a configuration file from an external public GitHub repository to configure the action.

Let's say that the configuration file is located in `github/octorepo/dependency-review-config.yml@main`

The Dependency Review Action workflow file will then look like this:

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          config-file: 'github/octorepo/dependency-review-config.yml@main'
```

## Using a configuration file from an external repository with a personal access token

The following example will use a configuration file from an external private GitHub repository to configure the action.

Let's say that the configuration file is located in `github/octorepo-private/dependency-review-config.yml@main`

The Dependency Review Action workflow file will then look like this:

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          config-file: 'github/octorepo-private/dependency-review-config.yml@main'
          external-repo-token: ${{ secrets.GITHUB_TOKEN }} # or a personal access token
```

## Getting the results of the action in the PR as a comment

Using the `comment-summary-in-pr` you can get the results of the action in the PR as a comment. In order for this to work, the action needs to be able to create a comment in the PR. This requires additional `pull-requests: write` permission.

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
          comment-summary-in-pr: always
```

## Getting the results of the action in a later step

- `comment-content` contains the output of the results comment for the entire run.
  `dependency-changes`, `vulnerable-changes`, `invalid-license-changes` and `denied-changes` are all JSON objects that allow you to access individual sets of changes.

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        id: review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
      - name: 'Report'
        # make sure this step runs even if the previous failed
        if: ${{ failure() && steps.review.conclusion == 'failure' }}
        shell: bash
        env: # store comment HTML data in an environment variable
          COMMENT: ${{ steps.review.outputs.comment-content }}
        run: | # do something with the comment:
          echo "$COMMENT"
      - name: 'List vulnerable dependencies'
        # make sure this step runs even if the previous failed
        if: ${{ failure() && steps.review.conclusion == 'failure' }}
        shell: bash
        env: # store JSON data in an environment variable
          VULNERABLE_CHANGES: ${{ steps.review.outputs.vulnerable-changes }}
        run: | # do something with the JSON:
          echo "$VULNERABLE_CHANGES" | jq '.[].package_url'
```

## Exclude dependencies from the license check

Using the `allow-dependencies-licenses` you can exclude dependencies from the license check. The values should be provided in [purl](https://github.com/package-url/purl-spec) format.

In this example, we are excluding `lodash` from `npm` and `requests` from `pip` dependencies from the license check

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
          comment-summary-in-pr: always
          allow-dependencies-licenses: 'pkg:npm/lodash, pkg:pypi/requests'
```

If we were to use configuration file, the configuration would look like this:

```yaml
fail-on-severity: 'critical'
allow-licenses:
  - 'LGPL-2.0'
  - 'BSD-2-Clause'
allow-dependencies-licenses:
  - 'pkg:npm/lodash'
  - 'pkg:pypi/requests'
```

## Only check for vulnerabilities

To only do the vulnerability check you can use the `license-check` to disable the license compatibility check (which is done by default).

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: critical
          comment-summary-in-pr: always
          license-check: false
```

## Exclude dependencies from their name or groups

With the `deny-packages` option, you can exclude dependencies based on their PURL (Package URL). If a specific version is provided, the action will deny packages matching that version. When no version is specified, the action treats it as a wildcard, denying all matching packages regardless of version. Multiple values can be added, separated by commas.

Using the `deny-groups` option you can exclude dependencies by their group name/namespace. You can add multiple values separated by a comma.

In this example, we are excluding all versions of `pkg:maven/org.apache.logging.log4j:log4j-api` and only `2.23.0` of log4j-core `pkg:maven/org.apache.logging.log4j/log4j-core@2.23.0` from `maven` and all packages in the group `pkg:maven/com.bazaarvoice.maven/`

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          deny-packages: 'pkg:maven/org.apache.logging.log4j/log4j-api,pkg:maven/org.apache.logging.log4j/log4j-core@2.23.0'
          deny-groups: 'pkg:maven/com.bazaarvoice.jolt/'
```

## Waiting for dependency submission jobs to complete

When possible, this action will [include dependencies submitted through the dependency submission API][DSAPI]. In this case,
it's important for the action not to complete until all of the relevant dependencies have been submitted for both the base
and head commits.

When this action runs before one or more of the dependency submission actions, there will be an unequal number of dependency
snapshots between the base and head commits. For example, there may be one snapshot available for the tip of `main` and none
for the PR branch. In that case, the API response will contain a "snapshot warning" explaining the discrepancy.

In this example, when the action encounters one of these warnings it will retry every 10 seconds after that for 60 seconds
or until there is no warning in the response.

```yaml
name: 'Dependency Review'
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v6
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
        with:
          retry-on-snapshot-warnings: true
          retry-on-snapshot-warnings-timeout: 60
```

[DSAPI]: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review#best-practices-for-using-the-dependency-review-api-and-the-dependency-submission-api-together

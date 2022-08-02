# dependency-review-action

This action scans your pull requests for dependency changes and will raise an error if any new dependencies have existing vulnerabilities. The action is supported by an [API endpoint](https://docs.github.com/en/rest/reference/dependency-graph#dependency-review) that diffs the dependencies between any two revisions.

The action is available for all public repositories, as well as private repositories that have GitHub Advanced Security licensed.

<img width="854" alt="Screen Shot 2022-03-31 at 1 10 51 PM" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">

## Upgrading from V2: Breaking changes

Version introduced two breaking changes.

### Required permission

If you are restricting the workflow or job [permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs) for `GITHUB_TOKEN` you will need to add the `checks` with write permissions:

```
permissions:
  checks: write
```

If you are using a custom token with `repo-token` parameter, you will need to make sure the token has `checks` **write** permission.

### Action Failing

The action no longer fails if a vulnerable dependency or a policy violation is found.

If you want to stop your pull request from being merge you can make the `Dependency Review Dependencies` and/or the `Dependency Review Licenses` required in your [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging).

If you want to keep the old behavior (action failed on a violation) you can set the `fail-on-violation` parameter to true.

## Installation

1. Add a new YAML workflow to your `.github/workflows` folder:

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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v2
```

Please keep in mind that you need a GitHub Advanced Security license if you're running this action on private repos.

## Configuration

You can pass additional options to the Dependency Review
Action using your workflow file. Here's an example workflow with
all the possible configurations:

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
        uses: actions/checkout@v3
      - name: Dependency Review
        uses: actions/dependency-review-action@v2
        with:
          # Possible values: "critical", "high", "moderate", "low"
          # fail-on-severity: critical
          #
          # You can only include one of these two options: `allow-licenses` and `deny-licenses`
          #
          # Possible values: Any `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # allow-licenses: GPL-3.0, BSD-3-Clause, MIT
          #
          # Possible values: Any `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # deny-licenses: LGPL-2.0, BSD-2-Clause
          #
          # The name of vulnerabilities check. The check will fail if vulnerabilities are found.
          # check-name-vulnerabilities: 'Dependency Review Vulnerabilities'
          #
          # The name of policies check. The check will fail if non allowed policies are found.
          # check-name-licenses: 'Dependency Review Policies'
          #
          # Fail the action if violation(s) are found (either vulnerability or licenses)
          # fail-on-violation: false
```

### Vulnerability Severity

By default the `Dependency Review Vulnerabilities` check will fail on any pull request that contains a
vulnerable dependency, regardless of the severity level. You can override this behavior by
using the `fail-on-severity` option, which will cause a failure on any pull requests that introduce vulnerabilities of the specified severity level or higher. The possible values are: `critical`, `high`, `moderate`, or `low`. The
action defaults to `low`.

This example will only fail on pull requests with `critical` and `high` vulnerabilities:

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    fail-on-severity: high
```

> If you want to fail the action when vulnerable packages are found, set the `fail-on-violation` parameter to true.

### Licenses

If non allowed licenses are found, the `Dependency Review Policies` will fail.

With `allow-licenses` you can define the list of licenses
your repository will accept. Alternatively, you can use `deny-licenses` to only
forbid a subset of licenses.

> If you want to fail the action when non allowed license violations are found, set the `fail-on-violation` parameter to true.

You can use the [Licenses
API](https://docs.github.com/en/rest/licenses) to see the full list of
supported licenses. Use the `spdx_id` field for every license you want
to filter. A couple of examples:

```yaml
# only allow MIT-licensed dependents
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    allow-licenses: MIT
```

```yaml
# Block Apache 1.1 and 2.0 licensed dependents
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    deny-licenses: Apache-1.1, Apache-2.0
```

**Important**

- The action will only accept one of the two parameters; an error will
  be raised if you provide both.
- By default both parameters are empty (no license checking is
  performed).
- We don't have license information for all of your dependents. If we
  can't detect the license for a dependency **we will inform you, but the
  action won't fail**.

## Blocking pull requests

The Dependency Review GitHub Action check will only block a pull request from being merged if the repository owner has required the check(s) to pass before merging. The action will emit two checks (the names can be overriden):

- `Dependency Review Vulnerabilities` If vulnerabilities are found the check will fail, the check details will list in a tabular fashions the packages (grouped by manifest) with vulneralities, along with the vulnerability name and severity.
- `Dependency Review Policies` If non allowed licenses are found the check will fail. the check details will list in a tabular fashion the list of packages that have non allowed licenses as well as packages for which GitHub doesn't has license information.

<img src="https://user-images.githubusercontent.com/7847935/183286441-4e17e46c-75e7-4e30-a7b1-70db53ed18fe.png">

For more information, see the [documentation on protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging).

## Getting help

If you have bug reports, questions or suggestions please [create a new
issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project.

Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License

This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

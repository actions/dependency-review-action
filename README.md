# dependency-review-action

This action scans your pull requests for dependency changes, and will
raise an error if any vulnerabilities or invalid licenses are being introduced. The action is supported by an [API endpoint](https://docs.github.com/en/rest/reference/dependency-graph#dependency-review) that diffs the dependencies between any two revisions.

The action is available for all public repositories, as well as private repositories that have GitHub Advanced Security licensed.

You can see the results on the job logs

<img width="854" alt="Screen Shot 2022-03-31 at 1 10 51 PM" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">

or on the job summary

<img src="https://user-images.githubusercontent.com/7847935/182871416-50332bbb-b279-4621-a136-ca72a4314301.png">

## Installation

**Please keep in mind that you need a [GitHub Advanced Security](https://docs.github.com/en/enterprise-cloud@latest/get-started/learning-about-github/about-github-advanced-security) license if you're running this action on private repositories.**

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

### GitHub Enterprise Server

This action is available in GHES starting with version 3.6. Make sure
[GitHub Advanced
Security](https://docs.github.com/en/enterprise-server@3.6/admin/code-security/managing-github-advanced-security-for-your-enterprise/enabling-github-advanced-security-for-your-enterprise)
and [GitHub
Connect](https://docs.github.com/en/enterprise-server@3.6/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect)
are enabled.

You can use the same workflow as above, replacing the `runs-on` value
with the label of any of your runners (the default label
is `self-hosted`):

```yaml

# ...

jobs:
  dependency-review:
    runs-on: self-hosted
    steps:
      - name: 'Checkout Repository'
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v2
```

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
          # Possible values: Any available git ref
          # base-ref: ${{ github.event.pull_request.base.ref }}
          # head-ref: ${{ github.event.pull_request.head.ref }}
          #
          # You can only include one of these two options: `allow-licenses` and `deny-licenses`. These options are not supported on GHES. 
          #
          # Possible values: Any `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # allow-licenses: GPL-3.0, BSD-3-Clause, MIT
          #
          # Possible values: Any `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # deny-licenses: LGPL-2.0, BSD-2-Clause
```

When the workflow with this action is caused by a `pull_request` or `pull_request_target` event,
the `base-ref` and `head-ref` values have the defaults as shown above. If the workflow is caused by
any other event, the `base-ref` and `head-ref` options must be
explicitly set in the configuration file.

### Vulnerability Severity

By default the action will fail on any pull request that contains a
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

### Licenses

You can set the action to fail on pull requests based on the licenses of the dependencies
they introduce. With `allow-licenses` you can define the list of licenses
your repository will accept. Alternatively, you can use `deny-licenses` to only
forbid a subset of licenses. These options are not supported on GHES.

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

The Dependency Review GitHub Action check will only block a pull request from being merged if the repository owner has required the check to pass before merging. For more information, see the [documentation on protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging).

## Getting help

If you have bug reports, questions or suggestions please [create a new
issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project.

Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License

This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

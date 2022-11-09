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

This action is available in Enterprise Server starting with version 3.6. Make sure
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

Configure this action by either using an external configuration file,
or by inlining these options in your workflow file.

## Configuration Options

### config-file

A string representing the path to a configuraton file. It can be a
local file, or a file located in an external repository. You can use
this syntax for external repositories: `OWNER/REPOSITORY/FILENAME@BRANCH`.

If the configuration file is located in an external private repository,
use the [external-repo-token](#external-repo-token) parameter of the
Action to specify a token that has read access to the repository.

**Possible values**: A string representing an absolute path to a file,
or a file located in another repository:

**Example**: `config-file: ./.github/dependency-review-config.yml # local file`.

**Example**: `config-file: github/octorepo/dependency-review-config.yml@main # external repo`

### fail-on-severity

Configure the severity level for alerting. See "[Vulnerability Severity](https://github.com/actions/dependency-review-action#vulnerability-severity)".

**Possible values**: `critical`, `high`, `moderate`, `low`.

**Example**: `fail-on-severity: moderate`.

### fail-on-scopes

A list of strings representing the build environments you want to
support. The default value is `development, runtime`.

**Possible values**: `development`, `runtime`, `unknown`

**Inline example**: `fail-on-scopes: development, runtime`

**YAML example**:

```yaml
# this prevents scanning development dependencies
fail-on-scopes:
  - runtime
```

### allow-licenses

Only allow the licenses that comply with the expressions in this list. See "[Licenses](https://github.com/actions/dependency-review-action#licenses)".

**Possible values**: A list of of [SPDX-compliant license identifiers](https://spdx.org/licenses/).

**Inline example**: `allow-licenses: BSD-3-Clause, LGPL-2.1 OR MIT OR BSD-3-Clause`

**YAML example**:

```yaml
allow-licenses:
  - BSD-3-Clause
  - LGPL-2.1
  - MIT
  - BSD-3-Clause
```

### deny-licenses

Add a custom list of licenses you want to block. See
"[Licenses](https://github.com/actions/dependency-review-action#licenses)".

**Possible values**: Any valid set of [SPDX licenses](https://spdx.org/licenses/).

**Inline example**: `deny-licenses: LGPL-2.0, GPL-2.0+ WITH Bison-exception-2.2`

**YAML example**:

```yaml
deny-licenses:
  - LGPL-2.0
  - GPL-2.0+ WITH Bison-exception-2.2
```

### allow-ghsas

Add a custom list of GitHub Advisory IDs that can be skipped during detection.

**Possible values**: Any valid advisory GHSA ids.

**Inline example**: `allow-ghsas: GHSA-abcd-1234-5679, GHSA-efgh-1234-5679`

**YAML example**:

```yaml
allow-ghsas:
  - GHSA-abcd-1234-5679
  - GHSA-efgh-1234-5679
```

### license-check/vulnerability-check

Disable the license checks or vulnerability checks performed by this Action.
You can't disable both checks.

**Possible values**: `true` or `false`

**Example**:

```yaml
license-check: true
vulnerability-check: false
```

### base-ref/head-ref

Provide custom git references for the git base/head when performing
the comparison. If you are using pull requests, or
`pull_request_target` events you do not need to worry about setting
this. The values need to be specified for all other event types.

**Possible values**: Any valid git ref(s) in your project.

**Example**:

```yaml
base-ref: 8bb8a58d6a4028b6c2e314d5caaf273f57644896
head-ref: 69af5638bf660cf218aad5709a4c100e42a2f37b
```

### external-repo-token

A token for fetching external configuration files if they live in
an external private repository.

Visit the [developer settings](https://github.com/settings/tokens) to
create a new personal access token with `read` permissions for the
repository that hosts the config file.

**Possible values**: Any GitHub token with read access to the external repository.

**Example**: `external-repo-token: ghp_123456789abcdef...`

### Configuration File

You can use an external configuration file to specify the settings for
this Action.

Start by specifying that you will be using an external configuration
file:

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    config-file: './.github/dependency-review-config.yml'
```

And then create the file in the path you just specified. **All of these fields are
optional**:

```yaml
fail-on-severity: 'critical'
allow-licenses:
  - 'GPL-3.0'
  - 'BSD-3-Clause'
  - 'MIT'
```

### Inline Configuration

You can pass options to the Dependency Review
Action using your workflow file. Here's an example of what the full
file would look like:

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
          fail-on-severity: moderate

          # Use comma-separated names to pass list arguments:
          deny-licenses: LGPL-2.0, BSD-2-Clause
```

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

### Dependency Scoping

By default the action will only fail on `runtime` dependencies that have vulnerabilities or unacceptable licenses, ignoring `development` dependencies. You can override this behavior with the `fail-on-scopes` option, which will allow you to list the specific dependency scopes you care about. The possible values are: `unknown`, `runtime`, and `development`. Note: Filtering by scope will not be supported on Enterprise Server just yet, as the REST API's introduction of `scope` will be released in an upcoming Enterprise Server version. We will treat all dependencies on Enterprise Server as having a `runtime` scope and thus will not be filtered away.

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    fail-on-scopes: runtime, development
```

### Licenses

You can set the action to fail on pull requests based on the licenses of the dependencies
they introduce. With `allow-licenses` you can define the list of licenses
your repository will accept. Alternatively, you can use `deny-licenses` to only
forbid a subset of licenses. These options are not supported on Enterprise Server.

You can use the [Licenses
API](https://docs.github.com/en/rest/licenses) to see the full list of
supported licenses. Use [SPDX licenses](https://spdx.org/licenses/)
to filter the licenses. A couple of examples:

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
    deny-licenses: Apache-1.1+
```

### Considerations

- Checking for licenses is not supported on Enterprise Server.
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

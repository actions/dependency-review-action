# dependency-review-action

This action scans your pull requests for dependency changes, and will
raise an error if any vulnerabilities or invalid licenses are being introduced. The action is supported by an [API endpoint](https://docs.github.com/rest/dependency-graph/dependency-review) that diffs the dependencies between any two revisions on your default branch.

The action is available for all public repositories, as well as private repositories that have GitHub Advanced Security licensed.

You can see the results on the job logs:

<img width="850" alt="GitHub workflow run log showing Dependency Review job output" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">

or on the job summary:

<img width="850" alt="GitHub job summary showing Dependency Review output" src="https://github.com/actions/dependency-review-action/assets/2161/42fbed1d-64a7-42bf-9b05-c416bc67493f">

## Installation

**Please keep in mind that you need a [GitHub Advanced Security](https://docs.github.com/enterprise-cloud@latest/get-started/learning-about-github/about-github-advanced-security) license if you're running this action on private repositories.**

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
        uses: actions/checkout@v4
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
```

### GitHub Enterprise Server

Make sure
[GitHub Advanced
Security](https://docs.github.com/enterprise-server@3.8/admin/code-security/managing-github-advanced-security-for-your-enterprise/enabling-github-advanced-security-for-your-enterprise)
and [GitHub
Connect](https://docs.github.com/enterprise-server@3.8/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect)
are enabled, and that you have installed the [dependency-review-action](https://github.com/actions/dependency-review-action) on the server.

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
        uses: actions/checkout@v4
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v4
```

## Configuration options

Configure this action by either inlining these options in your workflow file, or by using an external configuration file. All configuration options are optional.

| Option                                 | Usage                                                                                                                                                                                                      | Possible values                                                                                              | Default value |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| `fail-on-severity`                     | Defines the threshold for the level of severity. The action will fail on any pull requests that introduce vulnerabilities of the specified severity level or higher.                                       | `low`, `moderate`, `high`, `critical`                                                                        | `low`         |
| `allow-licenses`\*                     | Contains a list of allowed licenses. The action will fail on pull requests that introduce dependencies with licenses that do not match the list.                                                           | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)                                               | none          |
| `deny-licenses`\*                      | Contains a list of prohibited licenses. The action will fail on pull requests that introduce dependencies with licenses that match the list.                                                               | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)                                               | none          |
| `fail-on-scopes`                       | Contains a list of strings of the build environments you want to support. The action will fail on pull requests that introduce vulnerabilities in the scopes that match the list.                          | `runtime`, `development`, `unknown`                                                                          | `runtime`     |
| `allow-ghsas`                          | Contains a list of GitHub Advisory Database IDs that can be skipped during detection.                                                                                                                      | Any GHSAs from the [GitHub Advisory Database](https://github.com/advisories)                                 | none          |
| `license-check`                        | Enable or disable the license check performed by the action.                                                                                                                                               | `true`, `false`                                                                                              | `true`        |
| `vulnerability-check`                  | Enable or disable the vulnerability check performed by the action.                                                                                                                                         | `true`, `false`                                                                                              | `true`        |
| `allow-dependencies-licenses`\*        | Contains a list of packages that will be excluded from license checks.                                                                                                                                     | Any package(s) in [purl](https://github.com/package-url/purl-spec) format                                    | none          |
| `base-ref`/`head-ref`                  | Provide custom git references for the git base/head when performing the comparison check. This is only used for event types other than `pull_request` and `pull_request_target`.                           | Any valid git ref(s) in your project                                                                         | none          |
| `comment-summary-in-pr`                | Enable or disable reporting the review summary as a comment in the pull request. If enabled, you must give the workflow or job the `pull-requests: write` permission.                                      | `always`, `on-failure`, `never`                                                                              | `never`       |
| `deny-packages`                        | Any number of packages to block in a PR. This option will match on the exact version provided. If no version is provided, the option will treat the specified package as a wildcard and deny all versions. | Package(s) in [purl](https://github.com/package-url/purl-spec) format                                        | empty         |
| `deny-groups`                          | Any number of groups (namespaces) to block in a PR.                                                                                                                                                        | Namespace(s) in [purl](https://github.com/package-url/purl-spec) format (no package name, no version number) | empty         |
| `retry-on-snapshot-warnings`\*         | Enable or disable retrying the action every 10 seconds while waiting for dependency submission actions to complete.                                                                                        | `true`, `false`                                                                                              | `false`       |
| `retry-on-snapshot-warnings-timeout`\* | Maximum amount of time (in seconds) to retry the action while waiting for dependency submission actions to complete.                                                                                       | Any positive integer                                                                                         | 120           |
| `warn-only`+                           | When set to `true`, the action will log all vulnerabilities as warnings regardless of the severity, and the action will complete with a `success` status. This overrides the `fail-on-severity` option.    | `true`, `false`                                                                                              | `false`       |
| `show-openssf-scorecard-levels`        | When set to `true`, the action will output information about all the known OpenSSF Scorecard scores for the dependencies changed in this pull request.                                                     | `true`, `false`                                                                                              | `true`        |
| `warn-on-openssf-scorecard-level`      | When `show-openssf-scorecard-levels` is set to `true`, this option lets you configure the threshold for when a score is considered too low and gets a :warning: warning in the CI.                         | Any positive integer                                                                                         | 3             |
| `trusty-scores`                        | `trusty-scores` is a boolean to enable or disable Trusty scores                                                                                                                                            | `true`, `false`                                                                                              | `false`       |
| `trusty-retries`                       | `trusty-retries` specifies the number of retries the action uses to fetch from the trusty API.                                                                                                             | Any positive integer                                                                                         | 3             |
| `trusty-show`                          | `trusty-show` is the minimum score package to show.                                                                                                                                                        | Any positive integer                                                                                         | 7             |
| `trusty-warn`                          | `trusty-warn` is the minimum score before a warning is shown.                                                                                                                                              | Any positive integer                                                                                         | 5             |
| `trusty-fail`                          | `trusty-fail` is the minimum score before a failure is shown and the action is marked as failed.                                                                                                           | Any positive integer                                                                                         | 1             |

\*not supported for use with GitHub Enterprise Server

+when `warn-only` is set to `true`, all vulnerabilities, independently of the severity, will be reported as warnings and the action will not fail.

### Inline Configuration

You can pass options to the Dependency Review GitHub Action using your workflow file.

#### Example

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
        uses: actions/checkout@v4
      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate

          # Use comma-separated names to pass list arguments:
          deny-licenses: LGPL-2.0, BSD-2-Clause
```

### Configuration File

You can use an external configuration file to specify the settings for this action. It can be a local file or a file in an external repository. Refer to the following options for the specification.

| Option                | Usage                                                                                                                                                                                                                                                     | Possible values                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `config-file`         | A path to a file in the current repository or an external repository. Use this syntax for external files: `OWNER/REPOSITORY/FILENAME@BRANCH`                                                                                                              | **Local file**: `./.github/dependency-review-config.yml` <br> **External repo**: `github/octorepo/dependency-review-config.yml@main` |
| `external-repo-token` | Specifies a token for fetching the configuration file. It is required if the file resides in a private external repository and for all GitHub Enterprise Server repositories. Create a token in [developer settings](https://github.com/settings/tokens). | Any token with `read` permissions to the repository hosting the config file.                                                         |

#### Example

Start by specifying that you will be using an external configuration file:

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  with:
    config-file: './.github/dependency-review-config.yml'
```

And then create the file in the path you just specified. Please note
that the **option names in external files use underscores instead of dashes**:

```yaml
fail_on_severity: 'critical'
allow_licenses:
  - 'GPL-3.0'
  - 'BSD-3-Clause'
  - 'MIT'
```

For more examples of how to use this action and its configuration options, see the [examples](docs/examples.md) page.

### Considerations

- Checking for licenses is not supported on Enterprise Server as the API does not return license information.
- The `allow-licenses` and `deny-licenses` options are mutually exclusive; an error will be raised if you provide both.
- We don't have license information for all of your dependents. If we can't detect the license for a dependency **we will inform you, but the action won't fail**.

## Blocking pull requests

The Dependency Review GitHub Action check will only block a pull request from being merged if the repository owner has required the check to pass before merging. For more information, see the [documentation on protected branches](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging).

## Outputs

- `comment-content` is generated with the same content as would be present in a Dependency Review Action comment.
- `dependency-changes` holds all dependency changes in a JSON format. The following outputs are subsets of `dependency-changes` filtered based on the configuration:
- `vulnerable-changes` holds information about dependency changes with vulnerable dependencies in a JSON format.
- `invalid-license-changes` holds information about invalid or non-compliant license dependency changes in a JSON format.
- `denied-changes` holds information about denied dependency changes in a JSON format.

> [!NOTE]
> Action outputs are unicode strings [with a 1MB size limit](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#outputs-for-docker-container-and-javascript-actions).

> [!IMPORTANT]
> If you use these outputs in a run-step, you must store the output data in an environment variable instead of using the output directly. Using an output directly might break shell scripts. For example:
>
> ```yaml
> env:
>   VULNERABLE_CHANGES: ${{ steps.review.outputs.vulnerable-changes }}
> run: |
>   echo "$VULNERABLE_CHANGES" | jq
> ```
>
> instead of direct `echo '${{ steps.review.outputs.vulnerable-changes }}'`. See [examples](docs/examples.md) for more.

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project. Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License

This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

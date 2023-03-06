# dependency-review-action

This action scans your pull requests for dependency changes, and will
raise an error if any vulnerabilities or invalid licenses are being introduced. The action is supported by an [API endpoint](https://docs.github.com/en/rest/reference/dependency-graph#dependency-review) that diffs the dependencies between any two revisions on your default branch.

The action is available for all public repositories, as well as private repositories that have GitHub Advanced Security licensed.

You can see the results on the job logs:

<img width="854" alt="Screen Shot 2022-03-31 at 1 10 51 PM" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">

or on the job summary:

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
        uses: actions/dependency-review-action@v3
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
        uses: actions/dependency-review-action@v3
```

## Configuration options

Configure this action by either inlining these options in your workflow file, or by using an external configuration file. All configuration options are optional.

| Option                  | Usage                                                                                                                                                                             | Possible values                                                              | Default value |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| `fail-on-severity`      | Defines the threshold for the level of severity. The action will fail on any pull requests that introduce vulnerabilities of the specified severity level or higher.              | `low`, `moderate`, `high`, `critical`                                        | `low`         |
| `allow-licenses`*       | Contains a list of allowed licenses. The action will fail on pull requests that introduce dependencies with licenses that do not match the list.                                  | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)               | none          |
| `deny-licenses`*        | Contains a list of prohibited licenses. The action will fail on pull requests that introduce dependencies with licenses that match the list.                                      | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)               | none          |
| `fail-on-scopes`†       | Contains a list of strings of the build environments you want to support. The action will fail on pull requests that introduce vulnerabilities in the scopes that match the list. | `runtime`, `development`, `unknown`                                          | `runtime`     |
| `allow-ghsas`           | Contains a list of GitHub Advisory Database IDs that can be skipped during detection.                                                                                             | Any GHSAs from the [GitHub Advisory Database](https://github.com/advisories) | none          |
| `license-check`         | Enable or disable the license check performed by the action.                                                                                                                      | `true`, `false`                                                              | `true`        |
| `vulnerability-check`   | Enable or disable the vulnerability check performed by the action.                                                                                                                | `true`, `false`                                                              | `true`        |
| `base-ref`/`head-ref`   | Provide custom git references for the git base/head when performing the comparison check. This is only used for event types other than `pull_request` and `pull_request_target`.  | Any valid git ref(s) in your project                                         | none          |
| `comment-summary-in-pr` | Enable or disable reporting the review summary as a comment in the pull request. If enabled, you must give the workflow or job permission `pull-requests: write`.                 | `true`, `false`                                                              | `false`       |

*not supported for use with GitHub Enterprise Server

†will be supported with GitHub Enterprise Server 3.8

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
        uses: actions/checkout@v3
      - name: Dependency Review
        uses: actions/dependency-review-action@v3
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
  uses: actions/dependency-review-action@v2
  with:
    config-file: './.github/dependency-review-config.yml'
```

And then create the file in the path you just specified:

```yaml
fail-on-severity: 'critical'
allow-licenses:
  - 'GPL-3.0'
  - 'BSD-3-Clause'
  - 'MIT'
```

### Considerations

- Checking for licenses is not supported on Enterprise Server.
- The action will only accept one of the two `license` parameters; an error will be raised if you provide both.
- We don't have license information for all of your dependents. If we can't detect the license for a dependency **we will inform you, but the action won't fail**.

## Blocking pull requests

The Dependency Review GitHub Action check will only block a pull request from being merged if the repository owner has required the check to pass before merging. For more information, see the [documentation on protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging).

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project. Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License

This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

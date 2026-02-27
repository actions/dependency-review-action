# dependency-review-action

- [dependency-review-action](#dependency-review-action)
  - [Overview](#overview)
    - [Viewing the results](#viewing-the-results)
  - [Installation](#installation)
    - [Installation (standard)](#installation-standard)
    - [Installation (GitHub Enterprise Server)](#installation-github-enterprise-server)
  - [Configuration](#configuration)
    - [Configuration options](#configuration-options)
    - [Configuration methods](#configuration-methods)
      - [Option 1: Using inline configuration](#option-1-using-inline-configuration)
      - [Option 2: Using an external configuration file](#option-2-using-an-external-configuration-file)
      - [`OTHER` in license strings](#other-in-license-strings)
      - [Further information](#further-information)
  - [Using dependency review action to block a pull request from being merged](#using-dependency-review-action-to-block-a-pull-request-from-being-merged)
  - [Outputs](#outputs)
  - [Getting help](#getting-help)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

The dependency review action scans your pull requests for dependency changes, and will raise an error if any vulnerabilities or invalid licenses are being introduced.
The action is supported by an [API endpoint](https://docs.github.com/en/rest/dependency-graph/dependency-review?apiVersion=2022-11-28) that diffs the dependencies between any two revisions on your default branch.

The action is available for:

- Public repositories
- Private repositories with a [GitHub Advanced Security](https://docs.github.com/en/enterprise-cloud@latest/get-started/learning-about-github/about-github-advanced-security) license.

### Viewing the results

When the action runs, you can see the results on:

- The **job logs** page.
  1. Go to the **Actions** tab for the repository and select the relevant workflow run.
  1. Then under "Jobs", click **dependency review**.

  <img width="850" alt="GitHub workflow run log showing Dependency Review job output" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">

- The **job summary** page.
  1. Go to the **Actions** tab for the repository and select the relevant workflow run.
  1. Click **Summary**, then scroll to "dependency-review summary".

     <img width="850" alt="GitHub job summary showing Dependency Review output" src="https://github.com/actions/dependency-review-action/assets/2161/42fbed1d-64a7-42bf-9b05-c416bc67493f">

## Installation

- [Installation (standard)](#installation)
- [Installation (GitHub Enterprise Server)](#installation-github-enterprise-server)

#### Installation (standard)

You can install the action on any public repository, or any organization-owned private repository, provided the organization has a GitHub Advanced Security license.

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

#### Installation (GitHub Enterprise Server)

You can install the action on repositories on GitHub Enterprise Server.

1. Ensure [GitHub Advanced Security](https://docs.github.com/en/enterprise-server@latest/admin/code-security/managing-github-advanced-security-for-your-enterprise/enabling-github-advanced-security-for-your-enterprise) and [GitHub Connect](https://docs.github.com/en/enterprise-server@latest/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect) are enabled for the enterprise.
2. Ensure you have installed the [dependency-review-action](https://github.com/actions/dependency-review-action) on the server.
3. Add a new YAML workflow to your `.github/workflows` folder:

   ```yaml
   name: 'Dependency Review'
   on: [pull_request]

   permissions:
     contents: read

   jobs:
     dependency-review:
       runs-on: self-hosted
       steps:
         - name: 'Checkout Repository'
           uses: actions/checkout@v4
         - name: 'Dependency Review'
           uses: actions/dependency-review-action@v4
   ```

4. In the workflow file, replace the `runs-on` value with the label of any of your runners. (The default value is `self-hosted`.)

## Configuration

- [Configuration options](#configuration-options)
- [Configuration methods](#configuration-methods)

### Configuration options

There are various configuration options you can use to specify settings for the dependency review action.

All configuration options are optional.

| Option                                 | Usage                                                                                                                                                                                                                                                                                                                                                              | Possible values                                                                                              | Default value |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------- |
| `fail-on-severity`                     | Defines the threshold for the level of severity. The action will fail on any pull requests that introduce vulnerabilities of the specified severity level or higher.                                                                                                                                                                                               | `low`, `moderate`, `high`, `critical`                                                                        | `low`         |
| `allow-licenses`\*                     | Contains a list of allowed licenses. The action will fail on pull requests that introduce dependencies with licenses that do not match the list.                                                                                                                                                                                                                   | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)                                               | none          |
| `deny-licenses`\*                      | ⚠️ This option is deprecated for possible removal in the next major release. See [Deprecate the deny-licenses option #938](https://github.com/actions/dependency-review-action/issues/938) for more information. <br> Contains a list of prohibited licenses. The action will fail on pull requests that introduce dependencies with licenses that match the list. | Any [SPDX-compliant identifier(s)](https://spdx.org/licenses/)                                               | none          |
| `fail-on-scopes`                       | Contains a list of strings of the build environments you want to support. The action will fail on pull requests that introduce vulnerabilities in the scopes that match the list.                                                                                                                                                                                  | `runtime`, `development`, `unknown`                                                                          | `runtime`     |
| `allow-ghsas`                          | Contains a list of GitHub Advisory Database IDs that can be skipped during detection.                                                                                                                                                                                                                                                                              | Any GHSAs from the [GitHub Advisory Database](https://github.com/advisories)                                 | none          |
| `license-check`                        | Enable or disable the license check performed by the action.                                                                                                                                                                                                                                                                                                       | `true`, `false`                                                                                              | `true`        |
| `vulnerability-check`                  | Enable or disable the vulnerability check performed by the action.                                                                                                                                                                                                                                                                                                 | `true`, `false`                                                                                              | `true`        |
| `allow-dependencies-licenses`\*        | Contains a list of packages that will be excluded from license checks.                                                                                                                                                                                                                                                                                             | Any package(s) in [purl](https://github.com/package-url/purl-spec) format                                    | none          |
| `base-ref`/`head-ref`                  | Provide custom git references for the git base/head when performing the comparison check. This is only used for event types other than `pull_request` and `pull_request_target`.                                                                                                                                                                                   | Any valid git ref(s) in your project                                                                         | none          |
| `comment-summary-in-pr`                | Enable or disable reporting the review summary as a comment in the pull request. If enabled, you must give the workflow or job the `pull-requests: write` permission. With each execution, a new comment will overwrite the existing one.                                                                                                                          | `always`, `on-failure`, `never`                                                                              | `never`       |
| `deny-packages`                        | Any number of packages to block in a PR. This option will match on the exact version provided. If no version is provided, the option will treat the specified package as a wildcard and deny all versions.                                                                                                                                                         | Package(s) in [purl](https://github.com/package-url/purl-spec) format                                        | empty         |
| `deny-groups`                          | Any number of groups (namespaces) to block in a PR.                                                                                                                                                                                                                                                                                                                | Namespace(s) in [purl](https://github.com/package-url/purl-spec) format (no package name, no version number) | empty         |
| `retry-on-snapshot-warnings`\*         | Enable or disable retrying the action every 10 seconds while waiting for dependency submission actions to complete.                                                                                                                                                                                                                                                | `true`, `false`                                                                                              | `false`       |
| `retry-on-snapshot-warnings-timeout`\* | Maximum amount of time (in seconds) to retry the action while waiting for dependency submission actions to complete.                                                                                                                                                                                                                                               | Any positive integer                                                                                         | 120           |
| `warn-only`+                           | When set to `true`, the action will log all vulnerabilities as warnings regardless of the severity, and the action will complete with a `success` status. This overrides the `fail-on-severity` option.                                                                                                                                                            | `true`, `false`                                                                                              | `false`       |
| `show-openssf-scorecard`               | When set to `true`, the action will output information about all the known OpenSSF Scorecard scores for the dependencies changed in this pull request.                                                                                                                                                                                                             | `true`, `false`                                                                                              | `true`        |
| `warn-on-openssf-scorecard-level`      | When `show-openssf-scorecard-levels` is set to `true`, this option lets you configure the threshold for when a score is considered too low and gets a :warning: warning in the CI.                                                                                                                                                                                 | Any positive integer                                                                                         | 3             |
| `show-patched-versions`\*              | When set to `true`, the vulnerability summary table will include an additional column showing the first patched version for each vulnerability. This requires additional API calls to fetch advisory data.                                                                                                                                                          | `true`, `false`                                                                                              | `false`       |

> [!NOTE]
>
> - \* Not supported for use with GitHub Enterprise Server. (Checking for licenses is not supported on GitHub Enterprise Server because the API does not return license information.)
> - \+ When `warn-only` is set to `true`, all vulnerabilities, independently of the severity, will be reported as warnings and the action will not fail.
> - The `allow-licenses` and `deny-licenses` options are mutually exclusive; an error will be raised if you provide both.
> - If we can't detect the license for a dependency **we will inform you, but the action won't fail**.

### Configuration methods

To specify settings for the dependency review action, you can choose from two options:

- [Option 1: Inline the configuration options]() in your workflow file.
- [Option 2: Reference an external configuration file]() in your workflow file.

#### Option 1: Using inline configuration

You can pass configuration options to the dependency review action using your workflow file.

1. In the same YAML workflow file you created during installation, use the `with:` key to specify your chosen settings:

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
             allow-dependencies-licenses: "pkg:npm/@myorg/mypackage, pkg:npm/packagename, pkg:githubactions/owner/repo@2.0.0"
   ```

#### Option 2: Using an external configuration file

You can use an external configuration file to specify settings for this action. The file can be a local file or a file in an external repository.

1. In the same YAML workflow file you created during installation, use `config-file` to specify that you are using an external configuration file.

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
             config-file: './.github/dependency-review-config.yml'
   ```

   | Option        | Usage                                                                                                                                        | Possible values                                                                                                                      |
   | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
   | `config-file` | A path to a file in the current repository or an external repository. Use this syntax for external files: `OWNER/REPOSITORY/FILENAME@BRANCH` | **Local file**: `./.github/dependency-review-config.yml` <br> **External repo**: `github/octorepo/dependency-review-config.yml@main` |

2. Optionally, if the file resides in a private external repository, and for all GitHub Enterprise Server repositories, use `external-repo-token` to specify a token for fetching the file.

   ```yaml
   - name: Dependency Review
     uses: actions/dependency-review-action@v4
     with:
       config-file: 'github/octorepo/dependency-review-config.yml@main'
       external-repo-token: 'ghp_123456789abcde'
   ```

   | Option                | Usage                                                                                                                                                                                                                                                     | Possible values                                                              |
   | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
   | `external-repo-token` | Specifies a token for fetching the configuration file. It is required if the file resides in a private external repository and for all GitHub Enterprise Server repositories. Create a token in [developer settings](https://github.com/settings/tokens). | Any token with `read` permissions to the repository hosting the config file. |

3. Create the configuration file in the path you specified for `config-file`.
4. In the configuration file, specify your chosen settings.

   ```yaml
   fail-on-severity: 'critical'
   allow-licenses:
     - 'GPL-3.0'
     - 'BSD-3-Clause'
     - 'MIT'
   ```

#### `OTHER` in license strings

License data comes from [ClearlyDefined](https://clearlydefined.io) and you may sometimes see licenses displayed with the string `OTHER` in them. ClearlyDefined [defines OTHER](https://docs.clearlydefined.io/docs/curation/curation-guidelines) as:

> This indicates that a human confirmed that there is license information in the file but that the license is not an SPDX-identified license.

`OTHER` is not a valid [SPDX license identifier](https://spdx.org/licenses/), so we convert `OTHER` in a license string into `LicenseRef-clearlydefined-OTHER`, which _is_ valid in SPDX. If you want to add that to the deny or allow list, be sure to add `LicenseRef-clearlydefined-OTHER` to this list, because that is what we'll actually be comparing.

#### Further information

- For more examples of how to use this action and its configuration options, see the [examples](docs/examples.md) page.
- For general information about dependency review on GitHub, see "[About dependency review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review)" in the GitHub Docs documentation.

## Using dependency review action to block a pull request from being merged

You can configure your repository to block a pull request from being merged if the pull request fails the dependency review action check. To do this, the repository owner must configure branch protection settings that require the check to pass before merging. For more information, see "[Require status checks before merging](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging)" in GitHub Docs documentation.

## Outputs

Dependency review action can create [outputs](https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs), so that data from its execution can be used by other jobs in a workflow.

- `comment-content` is generated with the same content as would be present in a Dependency Review Action comment.
- `dependency-changes` holds all dependency changes in a JSON format. The following outputs are subsets of `dependency-changes` filtered based on the configuration:
  - `vulnerable-changes` holds information about dependency changes with vulnerable dependencies in a JSON format.
  - `invalid-license-changes` holds information about invalid or non-compliant license dependency changes in a JSON format.
  - `denied-changes` holds information about denied dependency changes in a JSON format.

> [!NOTE]
> Action outputs are unicode strings [with a 1MB size limit](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#outputs-for-docker-container-and-javascript-actions).
>
> If you use these outputs in a run-step, you must store the output data in an environment variable instead of using the output directly. Using an output directly might break shell scripts. For example:
>
> ```yaml
> env:
>   VULNERABLE_CHANGES: ${{ steps.review.outputs.vulnerable-changes }}
> run: |
>   echo "$VULNERABLE_CHANGES" | jq
> ```
>
> instead of direct `echo '${{ steps.review.outputs.vulnerable-changes }}'`.
> See [examples](docs/examples.md) for more.

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project. Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License

This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

# Examples on how to use the Dependancy Review Action

## Basic Usage

A very basic example of how to use the action. This will run the action with the default configuration.

The full list of configuration options can be found [here](../README.md#configuration-options).

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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
```

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

The Dependancy Review Action workflow file will then look like this:

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
        with:
          config-file: './.github/dependency-review-config.yml'
```

## Using a configuration file from a external repository

The following example will use a configuration file from an external public GitHub repository to configure the action.

Let's say that the configuration file is located in `github/octorepo/dependency-review-config.yml@main`

The Dependancy Review Action workflow file will then look like this:

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
        with:
          config-file: 'github/octorepo/dependency-review-config.yml@main'
```

## Using a configuration file from a external repository with a personal access token

The following example will use a configuration file from an external private GtiHub repository to configure the action.

Let's say that the configuration file is located in `github/octorepo-private/dependency-review-config.yml@main`

The Dependancy Review Action workflow file will then look like this:

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
        with:
          config-file: 'github/octorepo-private/dependency-review-config.yml@main'
          config-file-token: ${{ secrets.GITHUB_TOKEN }} # or a personal access token
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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
          comment-summary-in-pr: true
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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: critical
          deny-licenses: LGPL-2.0, BSD-2-Clause
          comment-summary-in-pr: true
          allow-dependencies-licenses: 'pkg:npm/loadash, pkg:pip/requests'
```

If we were to use configuration file, the configuration would look like this:

```yaml
fail-on-severity: 'critical'
allow-licenses:
  - 'LGPL-2.0'
  - 'BSD-2-Clause'
allow-dependencies-licenses:
  - 'pkg:npm/loadash'
  - 'pkg:pip/requests'
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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: critical
          comment-summary-in-pr: true
          license-check: false
```

## Exclude dependencies from their name or groups

Using the `deny-packages` you can exclude dependencies by their full package name. You can add multiple values separated by a comma.
Using the `deny-groups` you can exclude dependencies by their package group name. You can add multiple values separated by a comma.

In this example, we are excluding `log4j-api` and `log4j-code` from `maven` and `requests` from `pip` dependencies from the license check

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
        uses: actions/checkout@v3
      - name: 'Dependency Review'
        uses: actions/dependency-review-action@v3
        with:
          deny-packages: 'pkg:maven/org.apache.logging.log4j:log4j-api,pkg:maven/org.apache.logging.log4j:log4j-core'
          deny-groups: 'pkg:maven/com.bazaarvoice.maven'
```
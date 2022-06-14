# dependency-review-action

This action scans your pull requests for dependency changes and will raise an error if any new dependencies have existing vulnerabilities. The action is supported by an [API endpoint](https://docs.github.com/en/rest/reference/dependency-graph#dependency-review) that diffs the dependencies between any two revisions.

The action is available for all public repositories, as well as private repositories that have Github Advanced Security licensed.

<img width="854" alt="Screen Shot 2022-03-31 at 1 10 51 PM" src="https://user-images.githubusercontent.com/2161/161042286-b22d7dd3-13cb-458d-8744-ce70ed9bf562.png">


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
        uses: actions/dependency-review-action@v1
```

Please keep in mind that you need a GitHub Advanced Security license if you're running this Action on private repos.

## Configuration
You can pass additional options to Dependency Review
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
          # You can only can only include one of these two options: `allow-licenses` and `deny-licences`
          #
          # Possible values: Any `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # allow-licenses: GPL-3.0, BSD-3-Clause, MIT
          #
          # Possible values: Any  `spdx_id` value(s) from https://docs.github.com/en/rest/licenses
          # deny-licenses: LGPL-2.0, BSD-2-Clause
```

### Vulnerability Severity

By default the Action blocks any pull request that contains a
vulnerable dependency, regardless of the severity level. You can override this behavior by
using the `fail-on-severity` option. The possible values are: `critical`, `high`, `moderate`, `low`. The
Action defaults to `low`.

This example will only block pull requests with `critical` and `high` vulnerabilities:

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v2
  with:
    fail-on-severity: high
```

### Licenses

You can block pull requests based on the licenses of the dependencies
they introduce. With `allow-licenses` you can define the list of licenses
your repo will accept. Alternatively, you can use `deny-licenses` to only
forbid a subset of licenses.

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

* The Action will only accept one of the two parameters, an error will
be raised if you provide both.

* By default both parameters are empty (no license checking is
performed).

## Getting help

If you have bug reports, questions or suggestions please [create a new
issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project.

Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License
This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

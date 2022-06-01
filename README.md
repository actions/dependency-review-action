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

Please keep in mind that you need a GitHub Advanced Security license
if you're running this Action on private repos.

## Configuration

The Dependency Review Action uses a YAML configuration file. It
expects this file to be named `dependency-review.yml`, inside your
`.github/` directory.

Here's a sample configuration file:

```yaml
fail_on_severity: low
```

[Here](https://github.com/actions/dependency-review-action/blob/main/.github/dependency-review.yml)
you can see an example of the configuration file we use for this repository.

### Severity

By default this Action blocks any pull request that contains a
vulnerability of any severity level. You can override this behavior by
setting an option in your configuration file:

```yaml
# choose one of: 'critical', 'high', 'moderate' or 'low'
fail_on_severity: high
```

## Getting help

If you have bug reports, questions or suggestions please [create a new
issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project. 

Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License
This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

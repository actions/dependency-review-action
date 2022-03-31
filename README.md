# dependency-review-action

This Action scans your pull requests for vulnerabilities introduced
when adding or updating your project's dependencies. A check in your 
Pull Requests will let notify you of the results.

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

## Getting help

If you have bug reports, questions or suggestions please [create a new
issue](https://github.com/actions/dependency-review-action/issues/new/choose).

## Contributing

We are grateful for any contributions made to this project. 

Please read [CONTRIBUTING.MD](https://github.com/actions/dependency-review-action/blob/main/CONTRIBUTING.md) to get started.

## License
This project is released under the [MIT License](https://github.com/actions/dependency-review-action/blob/main/LICENSE).

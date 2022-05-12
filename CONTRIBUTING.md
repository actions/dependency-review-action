# Contributing
[fork]: https://github.com/actions/dependency-review-action/fork
[pr]: https://github.com/actions/dependency-review-action/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are
[released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license)
to the public under the [project's open source license](LICENSE).


Please note that this project is released with a [Contributor Code of
Conduct][code-of-conduct]. By participating in this project you agree
to abide by its terms.

### How it works

This Action makes an authenticated query to the Dependency Graph Diff
API endpoint (`GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}`)
to find out the set of added and removed dependencies for each manifest.


### Bootstrapping the project

```
git clone https://github.com/actions/dependency-review-action.git
cd dependency-review-action
npm install
```

### Running the tests

```
npm run test
```

*Note*: We don't have any useful tests yet, contributions are welcome!

## Local Development

We have a script to scan a given PR for vulnerabilities, this will
help you test your local changes. Make sure to [grab a Personal Access Token (PAT)](https://github.com/settings/tokens) before proceeding (you'll need `repo` permissions for private repos):

<img width="480" alt="Screenshot 2022-05-12 at 10 22 21" src="https://user-images.githubusercontent.com/2161/168026161-16788a0a-b6c8-428e-bb6a-83ea2a403070.png">

The syntax of the script is:

```sh
$ GITHUB_TOKEN=<token> ./scripts/scan_pr <pr_url>
```

Like this:

```sh
$ GITHUB_TOKEN=my-secret-token ./scripts/scan_pr https://github.com/actions/dependency-review-action/pull/3
```

## Submitting a pull request

0. [Fork][fork] and clone the repository
0. Configure and install the dependencies: `npm install`
0. Make sure the tests pass on your machine: `npm run test`
0. Create a new branch: `git checkout -b my-branch-name`
0. Make your change, add tests, and make sure the tests still pass
0. Make sure to build and package before pushing: `npm run build && npm run package`
0. Push to your fork and [submit a pull request][pr]
0. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)

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

_Note_: We don't have any useful tests yet, contributions are welcome!

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

[Configuration options](README.md#configuration-options) can be set via the [external config file](README.md#configuration-file) at [.github/dev-config](.github/dev-config.yml) and the script run the with a `--file` or `-f` flag

```sh
$ GITHUB_TOKEN=<token> ./scripts/scan_pr <pr_url> --file
```

## Submitting a pull request

0. [Fork][fork] and clone the repository
1. Configure and install the dependencies: `npm install`
2. Make sure the tests pass on your machine: `npm run test`
3. Create a new branch: `git checkout -b my-branch-name`
4. Make your change, add tests, and make sure the tests still pass
5. Make sure to build and package before pushing: `npm run build && npm run package`
6. Push to your fork and [submit a pull request][pr]
7. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Cutting a new release

1. Update the version number in [package.json](https://github.com/actions/dependency-review-action/blob/main/package.json).
1. Go to [Draft a new
   release](https://github.com/actions/dependency-review-action/releases/new)
   in the Releases page.
1. Make sure that the `Publish this Action to the GitHub Marketplace`
   checkbox is enabled

<img width="481" alt="Screenshot 2022-06-15 at 12 08 19" src="https://user-images.githubusercontent.com/2161/173822484-4b60d8b4-c674-4bff-b5ff-b0c4a3650ab7.png">

3. Click "Choose a tag" and then "Create new tag", where the tag name
   will be your version prefixed by a `v` (e.g. `v1.2.3`).
4. Use a version number for the release title (e.g. "1.2.3").

<img width="700" alt="Screenshot 2022-06-15 at 12 08 36" src="https://user-images.githubusercontent.com/2161/173822548-33ab3432-d679-4dc1-adf8-b50fdaf47de3.png">

5. Add your release notes. If this is a major version make sure to
   include a small description of the biggest changes in the new version.
6. Click "Publish Release".

You now have a tag and release using the semver version you used
above. The last remaining thing to do is to move the dynamic version
identifier to match the current SHA. This allows users to adopt a
major version number (e.g. `v1`) in their workflows while
automatically getting all the
minor/patch updates.

To do this just checkout `main`, force-create a new annotated tag, and push it:

```
git tag -fa v2 -m "Updating v2 to 2.3.4"
git push origin v2 --force
```

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)

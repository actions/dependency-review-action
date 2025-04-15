# Contributing

[fork]: https://github.com/actions/dependency-review-action/fork
[pr]: https://github.com/actions/dependency-review-action/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Bug reports and other issues

If you've encountered a problem, please let us know by [submitting an issue](https://github.com/actions/dependency-review-action/issues/new)!

## Enhancements and feature requests

If you've got an idea for a new feature or a significant change to the code or its dependencies, please submit as [an issue](https://github.com/actions/dependency-review-action/issues/new) so that the community can see it, and we can discuss it there. We may not be able to respond to every single issue, but will make a best effort!

If you'd like to make a contribution yourself, we ask that before significant effort is put into code changes, that we have agreement that the change aligns with our strategy for the action. Since this is a verified Action owned by GitHub we want to make sure that contributions are high quality, and that they maintain consistency with the rest of the action's behavior.

1. Create an [issue discussing the idea](https://github.com/actions/dependency-review-action/issues/new), so that we can discuss it there.
2. If we agree to incorporate the idea into the action, please write-up a high level summary of the approach that you plan to take so we can review

## Stalebot

We have begun using a [Stalebot action](https://github.com/actions/stale) to help keep the Issues and Pull requests backlogs tidy. You can see [the configuration](.github/workflows/stalebot.yml). If you'd like to keep an issue open after getting a stalebot warning, simply comment on it and it'll reset the clock.

## Development lifecycle

Ready to contribute to `dependency-review-action`?  Here is some information to help you get started.

### High level overview of the action

This action makes an authenticated query to the [Dependency Review API](https://docs.github.com/en/rest/dependency-graph/dependency-review) endpoint (`GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}`) to find out the set of added and removed dependencies for each manifest.

The action then evaluates the differences between the pushes based on the rules defined in the action configuration, and summarizes the differences and any violations of the rules you have defined as a comment in the pull request that triggered it and the action outputs.

### Local Development

Before you begin, you need to have [Node.js](https://nodejs.org/en/) installed, minimum version 20.

#### Bootstrapping the project

0. [Fork][fork] and clone the repository
1. Change to the working directory: `cd dependency-review-action`
2. Install the dependencies: `npm install`
3. Make sure the tests pass on your machine: `npm run test`

#### Manually testing for vulnerabilities

We have a script to scan a given PR for vulnerabilities, this will
help you test your local changes. Make sure to [grab a Personal Access Token (PAT)](https://github.com/settings/tokens) before proceeding (you'll need `repo` permissions for private repos):

<img width="480" alt="Screenshot 2022-05-12 at 10 22 21" src="https://user-images.githubusercontent.com/2161/168026161-16788a0a-b6c8-428e-bb6a-83ea2a403070.png">

The syntax of the script is:

```sh
$ GITHUB_TOKEN=<token> ./scripts/scan_pr <pr_url>
```

Like this:

```sh
$ GITHUB_TOKEN=<token> ./scripts/scan_pr https://github.com/actions/dependency-review-action/pull/3
```

[Configuration options](README.md#configuration-options) can be set by
passing an external YAML [configuration file](README.md#configuration-file) to the
`scan_pr` script with the `-c`/`--config-file` option:

```sh
$ GITHUB_TOKEN=<token> ./scripts/scan_pr --config-file my_custom_config.yml <pr_url>
```

#### Running unit tests

```
npm run test
```

_Note_: We don't have a very comprehensive test suite, so any contributions to the existing tests are welcome!

### Submitting a pull request

1. Create a new branch: `git checkout -b my-branch-name`
2. Make your change, add tests, and make sure the tests still pass
3. Make sure to build and package before pushing: `npm run build && npm run package`
4. Push to your fork and [submit a pull request][pr]

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Add unit tests for new features.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).
- Add examples of the usage to [examples.md](docs/examples.md)
- Link to a sample PR in a custom repository running your version of the Action.
- Please be responsive to any questions and feedback that you get from a maintainer of the repo!

## Cutting a new release

<details>

_Note: these instructions are for maintainers_

1. Update the version number in [package.json](https://github.com/actions/dependency-review-action/blob/main/package.json) and run `npm i` to update the lockfile.
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
git tag -fa v4 -m "Updating v4 to 4.0.1"
git push origin v4 --force
```
</details>


## Resources

- [Creating JavaScript GitHub actions](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)

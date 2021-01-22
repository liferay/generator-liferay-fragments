# Contributing

When contributing to this repository, please first discuss the change you wish
to make with the owners of this repository via issue, email, or any other
method before making a change.

Please note that we have a code of conduct and [code guidelines][1].
Please follow it in all your interactions regarding the project.

## Local development

In order to test your changes without having them published on master, you
can use `yarn link` feature:

1. Ensure you have uninstalled existing `generator-liferay-fragments`
   from global Yarn and NPM dependencies.
2. `cd yourToolkitProjectDirectory`.
3. `yarn link` (this only has to be runned once, run `yarn unlink` to undo).
4. Now you can use _Yeoman_ and _Yarn_ commands normally, it will use your
   local toolkit project.

> Sometimes, when using multiple NodeJS environments (ex. nvm), Yeoman
> might resolve a different version of the Toolkit that is installed globaly.
> To be sure about which generator is being executed, you can pass
> `--show-debug-info` flag to any command, and it will output the generator
> information and received arguments.

## Release Cycle

We use semver for every release, but we may publish more requests at once.
Currently we are trying to publish new versions just before Liferay Portal
GA releases, but new releases can be published if we need some fix or feature
to be available.

All CLI features must be _compatible_ with all Liferay Portal versions: if
they depend on some portal feature (API call ,service), they should fail
gracefully and so a nice error, but never break anything.

### Creating a new release

1. Create a new branch and add changes if needed:
   - `docs: x` update outdated documentation.
   - `build: Update/Remove x` update dependencies (`yarn audit`, `yarn outdated`, etc.).
   - `test: x` fix tests if neccesary.
   - `fix: x` fix something if needed.
   - `build: Prepare release vX.X.X` update `package.json`.
2. Create a [pull request][5] and merge into master.
3. Create [a new release][4]:
   - Create `vX.X.X` tag format (same for release title).
   - Write the changelog in the release description (an initial draft can be
     generated with `npx conventional-changelog-cli -p angular -r 2`.
4. Checkout created tag locally (`git fetch origin && git checkout vX.X.X`).
5. `yarn publish` release to `npmjs.com`.

#### Publishing a pre-release

In case of publishing a pre-release in order to test some new functionallity,
the steps are the same than publishing a regular release, except:

- The package version and tag name will be `vX.X.X-rcY`, being `X.X.X` the future
  stable version (ex. `2.12.1`) and `Y` an incremental number starting from 1
  (`v2.12.1-rc1`, `v2.12.1-rc2` ...).
- `yarn publish --tag next` should be run instead of `yarn publish`, to avoid
  overriding existing stable release.

## Pull Request Process

When you create your contribution, please keep this list in mind:

- Start from the existing master branch and add your changes. **Use [conventional commits][2] to write your commit messages**.
- Create your contribution.
- Ensure any install or build dependencies are removed before the end of the
  layer when doing a build.
- Add tests if necessary.
- Ensure that it passes all tests and linting process and includes JSDocs.
- Update the README.md with details of changes to the interface, this including
  new parameters, behaviour or even generators.
- **Do not change the version number manually** (see [Release Cycle][3]).
- Create your pull request against master branch and resolve any conflicts if
  necessary.

[1]: https://github.com/liferay/liferay-frontend-guidelines
[2]: https://github.com/liferay/liferay-frontend-guidelines/blob/master/general/commit_messages.md
[3]: https://github.com/liferay/generator-liferay-fragments/blob/master/CONTRIBUTING.md#release-cycle
[4]: https://github.com/liferay/generator-liferay-fragments/releases/new
[5]: https://github.com/liferay/generator-liferay-fragments/compare

# Contributing

When contributing to this repository, please first discuss the change you wish
to make with the owners of this repository via issue, email, or any other
method before making a change.

Please note that we have a code of conduct and [code guidelines][1].
Please follow it in all your interactions regarding the project.

## Local development

In order to test your changes without having them published on master, you
can use `npm link` feature:

1. Ensure you have uninstalled existing `generator-liferay-fragments`
   from global NPM.
2. `cd yourToolkitProjectDirectory`.
3. `npm link` (this only has to be runned once, run `npm unlink` to undo).
4. Now you can use *Yeoman* and *NPM* commands normally, it will use your
   local toolkit project.

## Pull Request Process

When you create your contribution, please keep this list in mind:

- Start from the existing master branch and add your changes.
- Create your contribution.
- Ensure any install or build dependencies are removed before the end of the
  layer when doing a build.
- Add tests if necessary.
- Ensure that it passes all tests and linting process and includes JSDocs.
- Update the README.md with details of changes to the interface, this including
  new parameters, behaviour or even generators.
- **Do not change the version number manually**. We use semver for every release,
  but we may publish more requests at once.
  > Currently we are trying to publish new versions just before Liferay Portal
  > GA releases.
- Create your pull request against master branch and resolve any conflicts if
  necessary.

[1]: https://github.com/liferay/liferay-frontend-guidelines

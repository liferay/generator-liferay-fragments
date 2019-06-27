[![NPM Publish Version][5]][6]

# Liferay Fragments CLI

This is an CLI for developing fragments for Liferay DXP. It allows generating fragments from scratch, exporting them from a Liferay instance and importing them back. It also supports developing with your preferred desktop tools, while the CLI watches your changes and sends them to a Liferay instance, so that you can try them in your browser immediately (or almost).

## Requirements

- [NodeJS][3] 8+
- [NPM][2] 6+
- [Yeoman][1] 2+

## Installation

First, install _Yeoman_ and _generator-liferay-fragments_ using _npm_
(we assume you have pre-installed _node.js_).

```bash
npm install -g yo
npm install -g generator-liferay-fragments
```

The first step is always to generate a new project. You must do this even if you will be exporting the fragments from a Liferay instance:

```bash
yo liferay-fragments
```

This command will guide you through a project creation and will
ask you some simple questions. Then you can just cd to this new project
and start working.

```bash
cd my-new-fragments-project
```

## Usage

Once you've created your project, there are several npm scripts that
will allow you to create fragments and fragment collections, export fragments from a Liferay instance and manage your existing fragments.

### Creating New Fragments

Fragments are always grouped inside collections. In order to create a collection use the following npm command:

- `add-collection`

You can create as many collections as desired.

Once a collection has been created, you can add as many fragments as desired inside running the following command:

- `add-fragment`

### Fragments Directory Structure

Collections and fragments must follow an specific (although simple) directory structure so that they can be imported into a Liferay instance. The information about each collection and fragment is stored inside `JSON` files,
and you can change them manually, there is no magic in here.

This is a sample directory structure with two collections and two fragments within the first collection:

```
src/
  collection-a/
    collection.json
    fragment-1/
      fragment.json
      index.html
      styles.css
      main.js
    fragment-2/
      ...
  collection-b/
    ...
```

### Exporting fragments from a Liferay instance

Instead of creating fragments from scratch, it's also possible to export them from an existing Liferay instance. This is very useful to continue the development of fragments with any desired desktop tool such as VSCode, Atom, Sublime, ... It also facilitates keeping the code of the fragments under version control and use any desired development tool such as SaSS, babel, ...

To export the fragments from an existing Liferay instance just run the `export`command. It will guide you through the information that you need to connect to Liferay and choose among its sites:

- `export`

### Importing fragments into a Liferay instance

After you have created your own fragments or after making modifications to exported fragments you can import them into a Liferay instance by running:

- `import`

You can also ask the Fragments CLI to watch for further changes and import them automatically. This is very useful during development time, so that you can just work with your preferred editor and the browser to check the changes automatically imported into Liferay.

- `import:watch`

### Previewing fragments with a Liferay Server

Sometimes you may want to see how a fragment will look once it has been imported to Liferay. With this command you can specify a Liferay Server and see your fragments rendered without importing them. Moreover, this command has also autoreload features, so you can make changes in your fragments rapidly.

- `preview`

### Packaging fragments for distribution

After you have finished the development of fragments, they can be distributed as a ZIP file, which can be imported inside any Liferay site. To prepare the ZIP file use the following method.

- `compress`

[1]: https://yeoman.io
[2]: https://www.npmjs.com
[3]: https://nodejs.org
[4]: https://github.com/lerna
[5]: https://badge.fury.io/js/generator-liferay-fragments.svg?style=flat
[6]: https://www.npmjs.com/package/generator-liferay-fragments

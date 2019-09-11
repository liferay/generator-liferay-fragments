[![NPM Publish Version][5]][6]

# Liferay Fragments CLI

This is a CLI for developing fragments for Liferay DXP. It allows

- generating fragments from scratch
- exporting them from a Liferay instance
- importing them into a Liferay instance

It also supports developing with your preferred desktop tools, while the CLI
watches your changes and sends them to a Liferay instance, so that you can try
them in your browser immediately.

## Requirements

- [NodeJS][3] 8+
- [NPM][2] 6+
- [Yeoman][1] 2+

## Installation

First, install *Yeoman* and *generator-liferay-fragments* using *npm*
(we assume you have pre-installed *node.js*).

```bash
npm install -g yo
npm install -g generator-liferay-fragments
```

When connecting to **Liferay DXP 7.2.0**, **Liferay Portal CE 7.2.0** or a previous version, please use version **1.1.0**. Newer versions depend on a new authentication mechanism that was not ready when those were released.

```bash
npm install -g generator-liferay-fragments@1.1.0
```

The first step is always to generate a new project. You must do this even if you
will be exporting the fragments from a Liferay instance:

```bash
yo liferay-fragments
```

This command will guide you through a project creation and will ask you some
simple questions. Then you can just cd to this new project and start working.

```bash
cd my-new-fragments-project
```



## Usage

Once you've created your project, there are several npm scripts that allow
you to create fragments and fragment collections, export fragments from a
Liferay instance, and manage your existing fragments.

### Creating New Fragments

Fragments are always grouped inside collections. To create a collection, run

```bash
npm run add-collection
```

You can create as many collections as desired.

Once a collection has been created, you can add as many fragments as desired
inside by running

```bash
npm run add-fragment
```

### Fragments Directory Structure

Collections and fragments must follow a specific (although simple) directory
structure so that they can be imported into a Liferay instance. The information
about each collection and fragment is stored inside `JSON` files, and you can
change them manually.

This is a sample directory structure with two collections and two fragments
within the first collection:

- `src/`
    - `collection-a/`
        - `collection.json`
        - `fragment-1/`
            - `fragment.json`
            - `index.html`
            - `styles.css`
            - `main.js`
        - `fragment-2/`<br>
          ...
    - `collection-b/`<br>
      ...

### Exporting fragments from a Liferay instance

Instead of creating fragments from scratch, it's also possible to export them
from an existing Liferay instance. This is very useful to continue the
development of fragments with any desired desktop tool such as VSCode, Atom,
Sublime, etc. It also facilitates keeping the code of the fragments under version
control and using any desired development tool (e.g., SaSS, babel, etc.).

To export the fragments from an existing Liferay instance, run the `export`
command. It will guide you through the information that you need to connect to
Liferay and choose among its sites:

```bash
npm run export
```

### Importing fragments into a Liferay instance

After you've created your own fragments or after you've made modifications to
exported fragments, you can import them into a Liferay instance by running:

```bash
npm run import
```

You can also ask the Fragments CLI to watch for further changes and import them
automatically. This is very useful during development time, so that you can work
with your preferred editor and the browser to check the changes automatically
imported into Liferay.

```bash
npm run import:watch
```

### Previewing fragments with a Liferay Server

> *Warning*: this functionality is only available with Liferay 7.2 Fixpack 1 or later.
> You also need to include the marketplace [Oauth 2 Plugin][7] in your Liferay Portal.

Sometimes you may want to see how a fragment will look once it has been imported
to Liferay. With the `preview` command, you can specify a Liferay Server and see
your fragments rendered without importing them. Moreover, this command also
autoreloads features, so you can make changes in your fragments rapidly.

```bash
npm run preview
```

### Packaging fragments for distribution

After you have finished the development of fragments, they can be distributed as
a ZIP file, which can be imported inside any Liferay site. To prepare the ZIP
file, run

```bash
npm run compress
```

[1]: https://yeoman.io
[2]: https://www.npmjs.com
[3]: https://nodejs.org
[4]: https://github.com/lerna
[5]: https://badge.fury.io/js/generator-liferay-fragments.svg?style=flat
[6]: https://www.npmjs.com/package/generator-liferay-fragments
[7]: https://web.liferay.com/marketplace/-/mp/application/109571986

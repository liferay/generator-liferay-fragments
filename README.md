[![NPM Publish Version][5]][6]

# Liferay Fragments Toolkit

This is a Toolkit for developing fragments for Liferay DXP. It allows

- generating fragments from scratch
- exporting them from a Liferay instance
- importing them into a Liferay instance

It also supports developing with your preferred desktop tools, while the Toolkit
watches your changes and sends them to a Liferay instance, so that you can try
them in your browser immediately.

## Requirements

- [NodeJS][3] 10+
- [NPM][2] 6+
- [Yeoman][1] 2+

## Installation

First, install *Yeoman* and *generator-liferay-fragments* using *npm*
(we assume you have pre-installed *node.js*).

```bash
npm install -g yo
npm install -g generator-liferay-fragments
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

> From v1.7.0 you can create not only fragments, but also templates and
> compositions. In this documentation file we will refer to all them as
> "elements", as they are being considered in all CLI commands (preview, import, etc).

### 📂 Project Structure

All elements must follow a specific (although simple) directory structure
so that they can be imported into a Liferay instance. The information about
each element is stored inside `JSON` files, and you can change them manually.

This is a sample directory structure with all the elements that can be managed
with the Toolkit:

- `collection-a/`
    - `collection.json`
    - `fragment-1/`
        - `fragment.json`
        - `configuration.json`
        - `index.html`
        - `styles.css`
        - `main.js`
    - `fragment-composition-1/`
        - `fragment-composition.json`
        - `definition.json`
- `master-page-a/`
    - `master-page.json`
    - `page-definition.json`
- `page-template-a/`
    - `page-template.json`
    - `page-definition.json`
- `display-page-template-a/`
    - `display-page-template.json`
    - `page-definition.json`

### 📄 Creating New Fragments

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

#### Fragments and Liferay versions

In newer Liferay Portal releases a lot of incredible features have been added
to the Toolkit and portal itself. Although this tool can manage any kind of
fragment, not all versions of portal support the same set of features. This
is a small summary of which features come with each release.

##### Liferay 7.2

- Support different fragment types: _section_ for full-with content elements and
  _component_ for smaller elements than can be nested anywhere.
  > If you want to create _section_ fragments you have to change `fragment.json`
  > file manually.

##### Liferay 7.3

- Fragment's can be configured by user if a `configuration.json` is defined.
- Now both _section_ and _component_ fragments can be nested anywhere on a page,
  so both types have the same effect.
- Support a new editable syntax that gives more control to developers when
  writing HTML.
- New fragment type _react_ that process fragment's JS before sending to portal.

### 🗐 Creating fragment compositions

Fragment compositions are treated as regular fragments, so they need to be grouped
inside collections too:

```bash
npm run add-fragment-composition
```

### 🐾 Creating Page Templates

All Page Templates can be created with a single command, which will ask the kind
of template you want to create:

```
npm run add-page-template
```

### 📥 Exporting from a Liferay instance

> ⚠️ When exporting a site, fragments with `type: 'react'` won't be
> be, as portal only keeps fragment compiled code.

Instead of creating elements from scratch, it's also possible to export them
from an existing Liferay instance. This is very useful to continue the
development with any desired desktop tool such as VSCode, Atom, Sublime, etc.
It also facilitates keeping the code under version control and using any
desired development tool (e.g., SaSS, babel, etc.).

To export the elements from an existing Liferay instance, run the `export`
command. It will guide you through the information that you need to connect to
Liferay and choose among its sites:

```bash
npm run export
```

### 📤 Importing into a Liferay instance

> ⚠️ When importing to a site, fragments with `type: 'react'` will
> be compiled and the imported. Portal doesn't store fragment's original source.

After you've created your own elements or after you've made modifications to
exported fragments, you can import them into a Liferay instance by running:

```bash
npm run import
```

You can also ask the Fragments Toolkit to watch for further changes and import them
automatically. This is very useful during development time, so that you can work
with your preferred editor and the browser to check the changes automatically
imported into Liferay.

```bash
npm run import:watch
```

### 👀 Previewing with a Liferay Server

> ⚠️ This functionality is only available with Liferay 7.2 Fixpack 1 or later.
> You also need to include the marketplace [Oauth 2 Plugin][7] in your Liferay Portal.

> ⚠️ Previewing fragments with `type: 'react'` is not supported (yet).

Sometimes you may want to see how an element will look once it has been imported
to Liferay. With the `preview` command, you can specify a Liferay Server and see
your elements rendered without importing them. Moreover, this command also
autoreloads features, so you can make changes in your fragments rapidly.

```bash
npm run preview
```

### 📦 Packaging for distribution

> ⚠️ Before creating the zip file, fragments with `type: 'react'` will
> be compiled. The zip file won't contain fragments' original source.

After you have finished the development of the project, it can be distributed as
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
[7]: https://web.liferay.com/es/marketplace/-/mp/application/109572023

const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const {log, logError, logNewLine, logIndent} = require('./log');
const path = require('path');
const readline = require('readline');
const request = require('request');

const reader = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const objectsInProcess = {};

let host = 'http://localhost:8080',
    username = 'test@liferay.com',
    password = 'test',
    companyId = 20099,
    groupId = 20126;

_askHost = () => {
	reader.question(
		`Liferay host & port? [${host}] `,
		(answer) => {
			host = answer !== '' ? answer : host;

			_askUsername();
		}
	);
};

_askPassword = () => {
	reader.question(
		`Liferay administrator password? [${password}] `,
		(answer) => {
			password = answer !== '' ?  answer : password;

			_requestCompanies();
		}
	);
};

_askUsername = () => {
	reader.question(
		`Liferay administrator username? [${username}] `,
		(answer) => {
			username = answer !== '' ?  answer : username;

			_askPassword();
		}
	);
};

_deployCollections = () => {
	glob.sync(`${__dirname}/../src/*/collection.json`)
		.map(collectionJSON => path.resolve(`${collectionJSON}/..`))
		.forEach(collectionDirectory => {
				const collectionJSON = JSON.parse(
					fs.readFileSync(`${collectionDirectory}/collection.json`));

				const collectionKey = path.basename(collectionDirectory);

				logNewLine(`Deploying collection ${chalk.reset(collectionJSON.name)}`);

				objectsInProcess[`collection${collectionJSON.name}`] = true;

				request.post(
					{
						auth: {
							user: username,
							pass: password
						},
						formData: {
							groupId: groupId,
							fragmentCollectionKey: collectionKey,
							name: collectionJSON.name,
							description: collectionJSON.description
						},
						jar: true,
						url: `${host}/api/jsonws/fragment.fragmentcollection/add-fragment-collection`
					},
					(error, response, body) => {
						if (error || (response && response.statusCode != 200)) {
							if (response.body && response.body.lastIndexOf("DuplicateFragmentCollectionKeyException") !== -1) {
								_updateCollection(collectionJSON, collectionKey, collectionDirectory);
							}
							else {
								logError(`Error deploying collection ${chalk.reset(collectionJSON.name)}: ${error}, ${response}`);

								process.exit(-1);
							}
						}
						else {
							const collection = JSON.parse(body);

							_deployFragments(
								collectionDirectory,
								collection,
								false
							);
						}
					}
				);
			}
		);
};

_deployFragments = (collectionDirectory, collection, updateAll) => {
	glob.sync(`${collectionDirectory}/*/fragment.json`)
		.map(fragmentJSON => path.resolve(`${fragmentJSON}/..`))
		.forEach(fragmentDirectory => {
				const fragmentJSON = JSON.parse(
					fs.readFileSync(`${fragmentDirectory}/fragment.json`));

				const fragmentKey = path.basename(fragmentDirectory);

				logIndent(`fragment ${chalk.reset(fragmentJSON.name)}`);

				const css = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.cssPath}`);
				const html = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.htmlPath}`);
				const js = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.jsPath}`);

				objectsInProcess[`fragment${fragmentJSON.name}`] = true;

				delete objectsInProcess[`collection${collection.name}`];

				request.post(
					{
						auth: {
							user: username,
							pass: password
						},
						formData: {
							groupId: groupId,
							fragmentCollectionId: collection.fragmentCollectionId,
							fragmentEntryKey: fragmentKey,
							name: fragmentJSON.name,
							css: css,
							html: html,
							js: js,
							status: 0
						},
						jar: true,
						url: `${host}/api/jsonws/fragment.fragmententry/add-fragment-entry`
					},
					(error, response, body) => {
						if (error || (response && response.statusCode != 200)) {
							if (response.body && response.body.lastIndexOf("DuplicateFragmentEntryKeyException") !== -1) {
								_updateFragment(fragmentJSON.name, fragmentKey, collection.fragmentCollectionId, css, html, js, updateAll);
							}
							else {
								logError(`Error deploying fragment ${chalk.reset(fragmentJSON.name)}: ${error}, ${response}`);

								process.exit(-1);
							}
						}
						else {
							_removeLock(`fragment${fragmentJSON.name}`);
						}
					}
				);
			}
		);
};

_getCollection = (name, key, callback) => {
	request.get(
		`${host}/api/jsonws/fragment.fragmentcollection/get-fragment-collections/group-id/${groupId}/name/${name}/start/-1/end/-1/-order-by-comparator`,
		{
			auth: {
				user: username,
				pass: password
			},
			jar: true
		},
		(error, response, body) => {
			if (error || (response && response.statusCode != 200)) {
				logError(`Error deploying collection ${chalk.reset(name)}: ${error}, ${response}`);

				process.exit(-1);
			}

			const collections = JSON.parse(body);

			let collection = {};

			collections.forEach(
				(item) => collection = item.fragmentCollectionKey === key ? item : collection
			);

			callback(collection);
		}
	);
};

_getFragment = (name, key, collectionId, callback) => {
	request.get(
		`${host}/api/jsonws/fragment.fragmententry/get-fragment-entries/group-id/${groupId}/fragment-collection-id/${collectionId}/name/${name}/status/0/start/-1/end/-1/-order-by-comparator`,
		{
			auth: {
				user: username,
				pass: password
			},
			jar: true
		},
		(error, response, body) => {
			if (error || (response && response.statusCode != 200)) {
				logError(`Error deploying fragment ${chalk.reset(name)}: ${error}, ${response}`);

				process.exit(-1);
			}

			const fragments = JSON.parse(body);

			let fragment = {};

			fragments.forEach(
				(item) => fragment = item.fragmentEntryKey === key ? item : fragment
			);

			callback(fragment);
		}
	);
};

_requestCompanies = () => {
	request.get(
		`${host}/api/jsonws/company/get-companies`,
		{
			auth: {
				user: username,
				pass: password
			},
			jar: true
		},
		(error, response, body) => {
			if (error || (response && response.statusCode != 200)) {
				logError(`Error getting companies list from ${host}: ${error}, ${response}`);

				process.exit(-1);
			}

			const companies = JSON.parse(body);

			companies.forEach(
				(company) => log(`${company.companyId} - ${company.webId}`)
			);

			reader.question(
				`Company ID? [${companyId}] `,
				(answer) => {
					companyId = answer !== '' ? answer : companyId;

					_requestGroups();
				}
			);
		}
	);
};

_requestGroups = () => {
	request.get(
		`${host}/api/jsonws/group/get-groups/company-id/${companyId}/parent-group-id/0/site/true`,
		{
			auth: {
				user: username,
				pass: password
			},
			jar: true
		},
		(error, response, body) => {
			if (error || (response && response.statusCode != 200)) {
				logError(`Error getting groups list from ${host}: ${error}, ${response}`);

				process.exit(-1);
			}

			const groups = JSON.parse(body);

			groups.forEach(
				(group) => log(`${group.groupId} - ${group.friendlyURL}`)
			);

			reader.question(
				`Group ID? [${groupId}] `,
				(answer) => {
					groupId = answer !== '' ? answer : groupId;

					_deployCollections();
				}
			);

		}
	);
};

_updateCollection = (collectionJSON, collectionKey, collectionDirectory) => {
	reader.question(
		`Collection "${collectionJSON.name}" already exists, update it including all the fragments? [A/y/n] `,
		(answer) => {
			const updateFlag = (answer !== '' ? answer : 'A').toLowerCase();

			switch (updateFlag.charAt(0)) {
				case 'a':
					_getCollection(
						collectionJSON.name,
						collectionKey,
						(collection) => {
							request.post(
								{
									auth: {
										user: username,
										pass: password
									},
									formData: {
										groupId: groupId,
										fragmentCollectionId: collection.fragmentCollectionId,
										name: collectionJSON.name,
										description: collectionJSON.description
									},
									jar: true,
									url: `${host}/api/jsonws/fragment.fragmentcollection/update-fragment-collection`
								},
								(error, response, body) => {
									if (error || (response && response.statusCode != 200)) {
										logError(`Error updating collection ${chalk.reset(collectionJSON.name)}: ${error}, ${response}`);

										process.exit(-1);
									}

									const collection = JSON.parse(body);

									_deployFragments(
										collectionDirectory,
										collection,
										true
									);
								}
							);

						}
					);
					break;
				case 'y':
					_getCollection(
						collectionJSON.name,
						collectionKey,
						(collection) => {
							request.post(
								{
									auth: {
										user: username,
										pass: password
									},
									formData: {
										groupId: groupId,
										fragmentCollectionId: collection.fragmentCollectionId,
										name: collectionJSON.name,
										description: collectionJSON.description
									},
									jar: true,
									url: `${host}/api/jsonws/fragment.fragmentcollection/update-fragment-collection`
								},
								(error, response, body) => {
									if (error || (response && response.statusCode != 200)) {
										logError(`Error updating collection ${chalk.reset(collectionJSON.name)}: ${error}, ${response}`);

										process.exit(-1);
									}

									const collection = JSON.parse(body);

									_deployFragments(
										collectionDirectory,
										collection,
										false
									);
								}
							);

						}
					);
					break;
				default:
					logNewLine(`Skipping existing collection ${chalk.reset(collectionJSON.name)}`);
					break;
			}
		}
	);
};

_updateFragment = (name, key, collectionId, css, html, js, updateAll) => {
	const doUpdateFragment = (fragment) => {
		request.post(
			{
				auth: {
					user: username,
					pass: password
				},
				formData: {
					groupId: groupId,
					fragmentEntryId: fragment.fragmentEntryId,
					name: name,
					css: css,
					html: html,
					js: js,
					status: 0
				},
				jar: true,
				url: `${host}/api/jsonws/fragment.fragmententry/update-fragment-entry`
			},
			(error, response, body) => {
				if (error || (response && response.statusCode != 200)) {
					logError(`Error updating fragment ${chalk.reset(fragmentJSON.name)}: ${error}, ${response}`);

					process.exit(-1);
				}
				else {
					_removeLock(`fragment${name}`);
				}
			}
		);
	};

	_getFragment(
		name,
		key,
		collectionId,
		(fragment) => {
			if (updateAll) {
				doUpdateFragment(fragment);
			}
			else {
				reader.question(
					`Fragment "${name}" already exists, update it including all the fragments? [Y/n]`,
					(answer) => {
						const updateFlag = (answer !== '' ? answer : 'y').toLowerCase();

						switch (updateFlag.charAt(0)) {
							case 'y':
								doUpdateFragment(fragment);
								break;
							default:
								logNewLine(`Skipping existing fragment ${chalk.reset(name)}`);

								_removeLock(`fragment${fragmentJSON.name}`);
								break;
						}
					}
				);
			}
		}
	);
};

_removeLock = (lockName) => {
	delete objectsInProcess[lockName];

	if (Object.entries(objectsInProcess).length == 0) {
		reader.close();
		process.stdin.destroy();
	}
};

_askHost();

process.on(
	'exit',
	(exitCode) => {
		if (exitCode !== -1) {
			logNewLine('Done! Your fragments are available in your Liferay instance.');
		}
	}
);
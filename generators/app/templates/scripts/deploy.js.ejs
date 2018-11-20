const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const {logNewLine, logIndent} = require('./log');
const path = require('path');
const readline = require('readline');
const request = require('request');

const reader = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let host = 'http://localhost:8080',
    username = 'test@liferay.com',
    password = 'test',
    companyId = 20099,
    groupId = 20126;

deployCollections = () => {
	glob.sync(`${__dirname}/../src/*/collection.json`)
		.map(collectionJSON => path.resolve(`${collectionJSON}/..`))
		.forEach(collectionDirectory => {
			const collectionName = path.basename(collectionDirectory);

			logNewLine(`Deploying collection ${chalk.reset(collectionName)}`);

            request.post(
                {
                    auth: {
                        user: username,
                        pass: password
                    },
                    formData: {
                    	groupId: groupId,
                    	name: collectionName,
                    	description: ''
                    },
                    jar: true,
                    url: `${host}/api/jsonws/fragment.fragmentcollection/add-fragment-collection`
                },
                (error, response, body) => {
                    if (error || (response && response.statusCode != 200)) {
                        logNewLine(
                            `Error deploying collection ${chalk.reset(collectionName)}: ${error}, ${response}`);

                        process.exit(-1);
                    }

					const collection = JSON.parse(body);

                    deployFragments(
                        collection.name,
                        collectionDirectory,
                        collection.fragmentCollectionId
                    );
                }
            );
        }
    );
};

deployFragments = (collectionName, collectionDirectory, collectionId) => {
	const rest = collectionDirectory.replace(collectionName, '');

	glob.sync(`${collectionDirectory}/*/fragment.json`)
		.map(fragmentJSON => path.resolve(`${fragmentJSON}/..`))
		.forEach(fragmentDirectory => {
			const fragmentName = path.basename(fragmentDirectory);

			logIndent(`fragment ${chalk.reset(fragmentName)}`);

			const fragmentJSON = JSON.parse(
				fs.readFileSync(`${fragmentDirectory}/fragment.json`));

			const css = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.cssPath}`);
			const html = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.htmlPath}`);
			const js = fs.readFileSync(`${fragmentDirectory}/${fragmentJSON.jsPath}`);

			request.post(
				{
					auth: {
						user: username,
						pass: password
					},
					formData: {
						groupId: groupId,
						fragmentCollectionId: collectionId,
						name: fragmentName,
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
						logNewLine(
							`Error deploying fragment ${chalk.reset(fragmentName)}: ${error}, ${response}`);

						process.exit(-1);
					}
				}
			);
		}
	);
};

_askHost = () => {
	reader.question(
		`Liferay host & port? [${host}] `,
		(answer) => {
			host = answer !== '' ? answer : host;

			_askUsername();
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

_askPassword = () => {
	reader.question(
		`Liferay administrator password? [${password}] `,
		(answer) => {
			password = answer !== '' ?  answer : password;

			_requestCompanies();
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
				logNewLine(`Error getting companies list from ${host}: ${error}, ${response}`);

				process.exit(-1);
			}

			const companies = JSON.parse(body);

			companies.forEach(
				(company) => logNewLine(`${company.companyId} - ${company.webId}`)
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
				logNewLine(`Error getting groups list from ${host}: ${error}, ${response}`);

				process.exit(-1);
			}

			const groups = JSON.parse(body);

			groups.forEach(
				(group) => logNewLine(`${group.groupId} - ${group.friendlyURL}`)
			);

			reader.question(
				`Group ID? [${groupId}] `,
				(answer) => {
					groupId = answer !== '' ? answer : groupId;

					reader.close();
					process.stdin.destroy();

					deployCollections();
				}
			);

		}
	);
};

_askHost();

process.on(
	'exit',
	(options, exitCode) => {
		if (exitCode !== -1) {
			logNewLine('Done! Your fragments are available in your Liferay instance.');
		}
	}
);
const {log, logError} = require('./log');
const readline = require('readline-sync');
const request = require('request');

let host = 'http://localhost:8080',
	username = 'test@liferay.com',
	password = 'test',
	companyId = 20099,
	groupId = 20126;

function askPortalData(callback) {
	var answer = readline.question(`Liferay host & port? [${host}] `);
	
	host = answer !== '' ? answer : host;
	
	_askUsername(callback);
}

function getGroupId() {
	return groupId;
}

function getHost() {
	return host;
}

function getPassword() {
	return password;
}

function getUsername() {
	return username;
}

function _askPassword(callback) {
	var answer = readline.question(`Liferay administrator password? [${password}] `);
	
	password = answer !== '' ?  answer : password;
	
	_askCompanies(callback);
}

function _askUsername(callback) {
	var answer = readline.question(`Liferay administrator username? [${username}] `);
	
	username = answer !== '' ?  answer : username;

	_askPassword(callback);
}

function _askCompanies(callback) {
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

			var answer = readline.question(`Company ID? [${companyId}] `);
				
			companyId = answer !== '' ? answer : companyId;

			_askGroups(callback);
		}
	);
}

function _askGroups(callback) {
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

			var answer = readline.question(`Group ID? [${groupId}] `);
				
			groupId = answer !== '' ? answer : groupId;

			callback();
		}
	);
}

module.exports = {
	askPortalData,
	getGroupId,
	getHost,
	getPassword,
	getUsername,
};

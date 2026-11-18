import Database from 'better-sqlite3';
import { SQL, sql } from 'drizzle-orm';
import { check, int, sqliteTable, sqliteView, text } from 'drizzle-orm/sqlite-core';
import * as fs from 'fs';
import { introspectSQLiteToFile } from 'tests/schemaDiffer';
import { expect, test } from 'vitest';

if (!fs.existsSync('tests/introspect/sqlite')) {
	fs.mkdirSync('tests/introspect/sqlite');
}

test('generated always column: link to another column', async () => {
	const sqlite = new Database(':memory:');

	const schema = {
		users: sqliteTable('users', {
			id: int('id'),
			email: text('email'),
			generatedEmail: text('generatedEmail').generatedAlwaysAs(
				(): SQL => sql`\`email\``,
			),
		}),
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'generated-link-column',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);
});

test('generated always column virtual: link to another column', async () => {
	const sqlite = new Database(':memory:');

	const schema = {
		users: sqliteTable('users', {
			id: int('id'),
			email: text('email'),
			generatedEmail: text('generatedEmail').generatedAlwaysAs(
				(): SQL => sql`\`email\``,
				{ mode: 'virtual' },
			),
		}),
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'generated-link-column-virtual',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);
});

test('instrospect strings with single quotes', async () => {
	const sqlite = new Database(':memory:');

	const schema = {
		columns: sqliteTable('columns', {
			text: text('text').default('escape\'s quotes " '),
		}),
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'introspect-strings-with-single-quotes',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);
});

test('introspect checks', async () => {
	const sqlite = new Database(':memory:');

	const schema = {
		users: sqliteTable('users', {
			id: int('id'),
			name: text('name'),
			age: int('age'),
		}, (table) => ({
			someCheck: check('some_check', sql`${table.age} > 21`),
		})),
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'introspect-checks',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);
});

test('introspect checks: each table keeps only its own', async () => {
	const sqlite = new Database(':memory:');

	const schema = {
		users: sqliteTable('users', {
			id: int('id'),
			age: int('age'),
		}, (table) => ({
			ageCheck: check('users_age_check', sql`${table.age} > 21`),
		})),
		posts: sqliteTable('posts', {
			id: int('id'),
			title: text('title'),
		}, (table) => ({
			titleCheck: check('posts_title_check', sql`length(${table.title}) > 0`),
		})),
		tags: sqliteTable('tags', {
			id: int('id'),
		}),
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'introspect-checks-per-table',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);

	const file = fs.readFileSync('tests/introspect/sqlite/introspect-checks-per-table.ts', 'utf8');
	expect(file.match(/users_age_check/g)?.length).toBe(1);
	expect(file.match(/posts_title_check/g)?.length).toBe(1);
});

test('view #1', async () => {
	const sqlite = new Database(':memory:');

	const users = sqliteTable('users', { id: int('id') });
	const testView = sqliteView('some_view', { id: int('id') }).as(
		sql`SELECT * FROM ${users}`,
	);

	const schema = {
		users: users,
		testView,
	};

	const { statements, sqlStatements } = await introspectSQLiteToFile(
		sqlite,
		schema,
		'view-1',
	);

	expect(statements.length).toBe(0);
	expect(sqlStatements.length).toBe(0);
});

var lf = require('lovefield');
var schemaBuilder = lf.schema.create('bot', 10);

schemaBuilder.createTable('Contact').
    addColumn('jid', lf.Type.STRING).
    addColumn('nick', lf.Type.STRING).
    addColumn('admin', lf.Type.BOOLEAN).
    addColumn('name', lf.Type.STRING).
	addColumn('memos', lf.Type.OBJECT).
    addPrimaryKey(['jid']).
    addUnique("jid_nick", ['jid', 'nick']);

schemaBuilder.createTable('Group').
    addColumn('jid', lf.Type.STRING).
    addColumn('members', lf.Type.OBJECT).
    addPrimaryKey(['jid']);

schemaBuilder.createTable('Request').
    addColumn('id', lf.Type.INTEGER).
    addColumn('user', lf.Type.STRING).
    addColumn('text', lf.Type.STRING).
    addColumn('status', lf.Type.BOOLEAN).
	addPrimaryKey(['id'], true);

module.exports = schemaBuilder;

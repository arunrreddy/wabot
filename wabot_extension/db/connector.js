var lf = require("lovefield");
var schemaBuilder = lf.schema.create("bot", 14);

schemaBuilder
	.createTable("Contact")
	.addColumn("jid", lf.Type.STRING)
	.addColumn("nick", lf.Type.STRING)
	.addColumn("admin", lf.Type.BOOLEAN)
	.addColumn("name", lf.Type.STRING)
	.addColumn("memos", lf.Type.OBJECT)
	.addPrimaryKey(["jid"])
	.addUnique("jid_nick", ["jid", "nick"]);

schemaBuilder
	.createTable("Group")
	.addColumn("jid", lf.Type.STRING)
	.addColumn("members", lf.Type.OBJECT)
	.addPrimaryKey(["jid"]);

schemaBuilder
	.createTable("Request")
	.addColumn("id", lf.Type.INTEGER)
	.addColumn("user", lf.Type.STRING)
	.addColumn("text", lf.Type.STRING)
	.addColumn("status", lf.Type.BOOLEAN)
	.addPrimaryKey(["id"], true);

schemaBuilder
	.createTable("Leaderboard")
	.addColumn("group_jid", lf.Type.STRING)
	.addColumn("games", lf.Type.OBJECT)
	.addPrimaryKey(["group_jid"]);

schemaBuilder
	.createTable("Lobby")
	.addColumn("group_jid", lf.Type.STRING)
	.addPrimaryKey(["group_jid"]);

module.exports = schemaBuilder;

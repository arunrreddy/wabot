module.exports = {
	get_groups: (db) => {
		var lobbyItem = db.getSchema().table("Lobby");
		return db
			.select()
			.from(lobbyItem)
			.exec();
	},
	add_group: (db, group) => {
		var lobbyItem = db.getSchema().table("Lobby");
		var lobbyRow = lobbyItem.createRow({
			group_jid: group
		});
		db
			.insert()
			.into(lobbyItem)
			.values([lobbyRow])
			.exec()
			.then((rows) => {
				console.log("Added lobby " + rows);
			})
			.catch((e) => {
				console.log(e);
			});
	}
};

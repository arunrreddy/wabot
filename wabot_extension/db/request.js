module.exports = {
	addRequest: (db, jid, text) => {
		var requestItem = db.getSchema().table("Request");
		var requestRow = requestItem.createRow({
			user: jid,
			text: text,
			status: false
		});
		return db
			.insert()
			.into(requestItem)
			.values([requestRow])
			.exec();
	},
	getRequests: (db) => {
		var requestItem = db.getSchema().table("Request");
		return db
			.select()
			.from(requestItem)
			.exec();
	},
	getRequestByID: (db, id) => {
		var requestItem = db.getSchema().table("Request");
		return db
			.select()
			.from(requestItem)
			.where(requestItem.id.eq(id))
			.exec();
	},
	markComplete: (db, id) => {
		var requestItem = db.getSchema().table("Request");
		db
			.update(requestItem)
			.set(requestItem.status, true)
			.where(requestItem.id.eq(id))
			.exec();
	}
};

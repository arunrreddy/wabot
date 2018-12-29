var Chance = require("chance");
var config = require("../lib/config.js");
chance = new Chance();
module.exports = {
	addContact: (db, jid) => {
		var contactItem = db.getSchema().table("Contact");
		var chance_name = chance.name();
		var contactRow = contactItem.createRow({
			jid: jid,
			nick: chance_name,
			name: chance_name,
			admin: jid === config.admin_jid ? true : false
		});
		db
			.insert()
			.into(contactItem)
			.values([contactRow])
			.exec()
			.then((rows) => {})
			.catch((e) => {});
	},
	getContacts: (db) => {
		var contactItem = db.getSchema().table("Contact");
		return db
			.select()
			.from(contactItem)
			.exec();
	},
	getContactByJid: (db, jid) => {
		var contactItem = db.getSchema().table("Contact");
		return db
			.select()
			.from(contactItem)
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	getTwoContacts: (db, jid1, jid2) => {
		var contactItem = db.getSchema().table("Contact");
		return db
			.select()
			.from(contactItem)
			.where(lf.op.or(contactItem.jid.eq(jid1), contactItem.jid.eq(jid2)))
			.exec();
	},
	checkAdmin: (db, jid) => {
		var contactItem = db.getSchema().table("Contact");
		return db
			.select()
			.from(contactItem)
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	updateNick: (db, jid, name) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.update(contactItem)
			.set(contactItem.nick, name)
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	addAdmin: (db, jid) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.update(contactItem)
			.set(contactItem.admin, true)
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	updateName: (db, jid, name) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.update(contactItem)
			.set(contactItem.name, name)
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	addMemo: (db, jid, memo_text) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.select()
			.from(contactItem)
			.where(contactItem.jid.eq(jid))
			.exec()
			.then((contact) => {
				var memos = contact[0].memos ? contact[0].memos : [];
				memos.push(memo_text);
				db
					.update(contactItem)
					.set(contactItem.memos, memos)
					.where(contactItem.jid.eq(jid))
					.exec();
			});
	},
	clearMemos: (db, jid) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.update(contactItem)
			.set(contactItem.memos, [])
			.where(contactItem.jid.eq(jid))
			.exec();
	},
	deleteMemo: (db, jid, index) => {
		var contactItem = db.getSchema().table("Contact");
		db
			.select()
			.from(contactItem)
			.where(contactItem.jid.eq(jid))
			.exec()
			.then((contact) => {
				var memos = contact[0].memos ? contact[0].memos : [];
				memos.splice(index, 1);
				db
					.update(contactItem)
					.set(contactItem.memos, memos)
					.where(contactItem.jid.eq(jid))
					.exec();
			});
	}
};

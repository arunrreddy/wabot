var contact = require('./contact.js');
var _ = require('underscore');
var config = require('../lib/config.js');
module.exports = {
    getGroups: (db) => {
        var groupItem = db.getSchema().table("Group");
        return db.select().from(groupItem).exec();
    },
    addGroup: (db, group) => {
        var groupItem = db.getSchema().table("Group");
        var groupMembers = group.members.filter((member) => {
            return member.id != config.bot_jid;
        });
        var groupRow = groupItem.createRow({
            "jid": group.id,
            "members": groupMembers
        });

        db.insert().
            into(groupItem).
            values([groupRow]).
            exec().then((rows) => {
            }).catch((e) => {
                db.update(groupItem).
                    set(groupItem.members, groupMembers).
                    where(groupItem.jid.eq(group.id)).
                    exec();
            });
    },
    getGroupByJid: (db, jid) => {
        var groupItem = db.getSchema().table("Group");
        return db.select().from(groupItem).where(groupItem.jid.eq(jid)).exec();
    },
    addGroupMember: (db, jid, member) => {
        var groupItem = db.getSchema().table("Group");
        db.select().from(groupItem).where(groupItem.jid.eq(jid)).exec().
            then((row) => {
                var newMembers = row[0].members;
                newMembers.push(member);
                newMembers = _.uniq(newMembers);
                db.update(groupItem).
                    set(groupItem.members, newMembers).
                    where(groupItem.jid.eq(jid)).
                    exec();
            });
    },
    deleteGroup: (db, jid, bugout) => {
        var groupItem = db.getSchema().table("Group");
        bugout.log("[DEBUG]: Deleting group " + jid);
        db.delete().from(groupItem).where(groupItem.jid.eq(jid)).exec();
    }
};

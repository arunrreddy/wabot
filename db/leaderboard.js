module.exports = {
  add_score: (db, group_jid, game, jid) => {
    var leaderboardItem = db.getSchema().table("Leaderboard");
    db.select().from(leaderboardItem).where(leaderboardItem.group_jid.eq(group_jid)).exec().then((group_board) => {
          if (group_board.length > 0) {
              // board exists
              var gameboard = group_board[0].games ? group_board[0].games : {};
              gameboard[game][jid] = gameboard[game][jid] ? (gameboard[game][jid] + 1) : 1;
              db.update(leaderboardItem).set(leaderboardItem.games, gameboard).
                  where(leaderboardItem.group_jid.eq(group_jid)).exec();
          } else { 
              var gameboard = {};
              gameboard[game] = {};
              gameboard[game][jid] = 1;
              var group_board = leaderboardItem.createRow({
                  "group_jid": group_jid,
                  "games": gameboard
              });	
              db.insert().into(leaderboardItem).values([group_board]).exec().then((rows) => {
                  console.log(rows);
              }).catch((e) => {
              });
          }
      });
  },
  get_score: (db, group_jid) => {
    var leaderboardItem = db.getSchema().table("Leaderboard");
    return db.select().from(leaderboardItem).where(leaderboardItem.group_jid.eq(group_jid)).exec();
  }
}

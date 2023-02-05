const axios = require('axios');
const Enmap = require('enmap');
const { JSDOM } = require("jsdom");
const DB = new Enmap({name: 'jlbs', dataDir: '/root/data/mpstats', autoEnsure: {}});
const gamesDB = new Enmap({name: 'games', dataDir: '/root/data/mpstats'})

module.exports = {
    execute(time) {
        return new Promise(async resolve => {
            let gameCount = 0;
            if (!time || time == undefined) time = Date.now();

            const gamesList = await gamesDB.get('java');

            gamesList.forEach(async gameObject => {
                let results = [];
                const game = gameObject.name;
                let name = game.split(/ +/);

                if (gameObject.active) {
                    results = await callLB(name);
                } else {
                    results = DB.get('current')[game];
                    if (results == undefined || results == []) {
                        console.log(`Had to resort to calling inactive game from MP Website because prior value was undefined (${game})`);
                        results = await callLB(name);
                    }
                };

                gameCount++;

                DB.ensure(String(time));
                DB.set(String(time), results, String(game));
                results = null;
            
                if (gameCount == gamesList.length) {
                    DB.set(String(time), Date.now(), 'time');
                    setTimeout(() => {
                        console.log(`Got${time == 'current' ? ' current' : ''} java LB${time == 'current' ? '' : ' for ' + new Date(Number(time)).toLocaleDateString()} - ${new Date().toDateString() + ', ' + new Date().toLocaleTimeString()}.`);
                        setTimeout(() => resolve(), 60000);
                    }, 1000);
                }
            });
        });
    }
};


function refine(res) {
    const dom = new JSDOM(res);
    
    const results = Array.from(dom.window.document.querySelectorAll("tr:not(.LeaderboardsHead)")).map(row => {
      const [positionEl, _, usernameEl, winsEl] = row.querySelectorAll("td");
    
      return array = {
          position: parseInt(positionEl.textContent),
          username: usernameEl.textContent,
          wins: parseInt(winsEl.textContent.replace(',', ''))
      };
    });
  
    return results;
};

async function callLB(name) {
    var res = (await axios.get(`https://www.mineplex.com/assets/www-mp/webtest/testy.php?game=${encodeURIComponent(name.join('%20').toLowerCase())}&antiCache=${Date.now()}`).catch(err => console.log('error getting LB:\n' + err)))?.data;
    if(res?.data?.length < 150) return console.log('error getting LB: getJavaLB.js\n' + res);
    var refined = refine(res);
    res = null;
    
    return refined;
};
const axios = require('axios');
const { JSDOM } = require("jsdom");

module.exports = {
    execute(time, gamesDB, DB) {
        return new Promise(async resolve => {
            let gameCount = 0;
            if (!time || time == undefined) time = Date.now();

            const gamesList = await gamesDB.get('bedrock');

            gamesList.forEach(async gameObject => {
                let results = [];
                const game = gameObject.name;
                let name = (game == 'Old Castle Defense' ? ['global'] : game.split(/ +/));

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
                if (results.length != 100) {
                    for (i = 0; i < 100; i++) {
                        if (!results[i]) {
                            let value;
                            if (!results[i]) value = {"position":i+1,"username":"x","wins":0};
                            results.push(value);
                        }
                    };
                }

                DB.set(String(time), results, String(game));
                results = null;

                if (gameCount == gamesList.length) {
                    DB.set(String(time), Date.now(), 'time');
                    setTimeout(() => {
                        console.log(`Got${time == 'current' ? ' current' : ''} bedrock LB${time == 'current' ? '' : ' for ' + new Date(Number(time)).toLocaleDateString()} - ${new Date().toDateString() + ', ' + new Date().toLocaleTimeString()}.`);
                        setTimeout(() => resolve(), 60000);
                    }, 1000);
                }
            });
        })
    }
};

function refine(res) {
    const dom = new JSDOM(res);

    return Array.from(dom.window.document.querySelectorAll('tr')).slice(1).map(row => {
        const [positionEl, usernameEl, winsEl] = row.querySelectorAll("td");  
   
        return {
            position: parseInt(positionEl.textContent),
            username: usernameEl.textContent,
            wins: parseInt(winsEl.textContent.replace(',', ''))
        };
   });
};

async function callLB(name) {
    var res = (await axios.get(`https://www.mineplex.com/assets/www-mp/webtest/mcoleaderboards.php?game=${encodeURIComponent(name.join('_').toLowerCase())}&antiCache=${Date.now()}`).catch(err => console.log('error getting LB:\n' + err)))?.data;
    if(res?.data?.length < 150) return console.log('error getting LB: getBedrockLB.js\n' + res);
    var refined = refine(res);
    res = null;
    
    return refined;
};
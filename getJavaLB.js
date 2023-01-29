const axios = require('axios');
const { JSDOM } = require("jsdom");

module.exports = {
    async execute(gamesDB, DB, time) {
        let results = {};
        let gameCount = 0;
        if (!time) time = Date.now();

        const gamesList = await gamesDB.get('java');

        gamesList.forEach(async gameObject => {
            const game = gameObject.name;
            let name = game.split(/ +/);

            if (gameObject.active) {
                const res1 = await axios.get(`https://www.mineplex.com/assets/www-mp/webtest/testy.php?game=${encodeURIComponent(name.join('%20').toLowerCase())}&antiCache=${Date.now()}`).catch(err => console.log('error getting LB:\n' + err));
                if(!res1 || res1 == undefined || res1 == null || !res1.data || res1.data.length < 150) return console.log('error getting LB: getJavaLB.js\n' + res1);
                let res = res1.data;
                const refined = refine(res);
                //console.log(game, !!refined)
                
                results[game] = refined;
            } else {
                results[game] = DB.get('current')[game] || DB.get('daily')[game];
            };

            gameCount++;
        
            if (gameCount == gamesList.length) {
                results.time = Date.now();
                setTimeout(() => {
                    DB.set(time, results);

                    console.log(`Got java LB at ${time} - ${new Date().toLocaleString()}.`);
                }, 500);
            }
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
}
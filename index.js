const Enmap = require('enmap');
const axios = require('axios');
const { JSDOM } = require("jsdom");

const gameData = require('./gamesData.json');
const gamesDB = new Enmap({name: 'games', autoEnsure: []});
if (gamesDB.get('bedrock')?.length == 0) gamesDB.set('bedrock', gameData.bedrock);
if (gamesDB.get('java')?.length == 0) gamesDB.set('java', gameData.java);

const prefix = '\u001b[36mMPStats | ';

/**
 * Options for the MPStats client
 * @typedef MPStatsClientOptions
 * 
 * @property {Boolean} cycleBedrock Whether or not to call bedrock leaderboards during the cycle. Defaults to true.
 * @property {Boolean} cycleJava Whether or not to call java leaderboards during the cycle. Defaults to true.
 * 
 * @property {Number} bedrockLbInterval The interval to call bedrock leaderboards on (in milliseconds). Defaults to 900000, 15 minutes.
 * @property {Number} javaLbInterval The interval to call java leaderboards on (in milliseconds). Defaults to 3600000, 60 minutes.
 * 
 * @property {String} bedrockLbURL The URL to use when calling bedrock leaderboards. Game name should be $gameName. Defaults to the Mineplex website raw leaderboard URL.
 * @property {String} javaLbURL The URL to use when calling java leaderboards. Game name should be $gameName. Defaults to the Mineplex website raw leaderboard URL.
 * 
 * @property {Boolean} reuseData Whether or not to reuse data from previous versions of a saved leaderboard for inactive games. Defaults to true.
 * 
 * @property {Boolean} logData Whether or not to log data, such as confirmation when a LB has been saved. Defaults to true.
 */

class MPStatsClient {
    /**
     * @param {MPStatsClientOptions} options The options for this MPStats client instance
     */
    constructor(options) {
        /**
         * The options for this MPStats client instance
         * @type {MPStatsClientOptions}
         */
        this.options = {
            cycleBedrock: options.cycleBedrock || true,
            cycleJava: options.cycleJava || true,

            bedrockLbInterval: options.bedrockLbInterval || 900000,
            javaLbInterval: options.javaLbInterval || 3600000,

            bedrockLbURL: options.bedrockLbURL || `https://www.mineplex.com/assets/www-mp/webtest/mcoleaderboards.php?game=$gameName&antiCache=${Date.now()}`,
            javaLbURL: options.javaLbURL || `https://www.mineplex.com/assets/www-mp/webtest/testy.php?game=$gameName&antiCache=${Date.now()}`,

            reuseData: options.reuseData || true,

            logData: options.logData || true
        }
    };

    /**
     * Start the cycle of downloading leaderboards at the intervals provided in the settings
     * @param {*} key The key to save the generated leaderboards as
     * @param {*} DB The Enmap database to save in
     */
    startCycle(key, DB) {
        if (this.options.logData) {
            console.log(prefix + 'MPStats module cycle started.');
            console.log(prefix + 'Beginning log of bedrock and java stats starting at ' + new Date().toDateString() + ', ' + new Date().toLocaleTimeString())
        };

        if(this.options.cycleBedrock) {
            if (!DB.get('java')) DB.set('java', []);
            this.saveLBs(key, 'bedrock', DB);
            setInterval(() => {
                this.saveLBs(key, 'bedrock', DB);
            }, this.options.bedrockLbInterval);
        };

        if(this.options.cycleJava) {
            if (!DB.get('java')) DB.set('java', []);
            this.saveLBs(key, 'java', DB);
            setInterval(() => {
                this.saveLBs(key, 'java', DB);
            }, this.options.javaLbInterval);
        };
    };


    /**
     * Collect a leaderboard from the Mineplex website and save it in an Enmap database
     * @param {String, Number} key The key to save the generated leaderboard as
     * @param {String} platform The platform (bedrock or java) to get and save
     * @param {Enmap} DB The Enmap database to save in
     */
    saveLBs(key, platform, DB) {
        return new Promise(resolve => {
            if (!DB.get(platform)) DB.set(platform, []);
            callLB(gamesDB, platform.toLowerCase(), this.options[platform.toLowerCase() + 'LbURL'], DB, this.options.reuseData, this.options.logData).then(lb => {
                DB.set(platform, lb, key);
                if (this.options.logData) console.log(prefix + `Successfully saved to database the ${platform} leaderboards on ${new Date().toDateString()} at ${new Date().toLocaleTimeString()}`);
                resolve();
            });
        });
    };


    /**
     * Returns the sole leaderboard of a single game as an array of objects
     * @param {String} game The name of the game for which to get the leaderboard
     * @param {String} platform The game's platform
     * @returns 
     */
    getLB(game, platform) {
        return new Promise(async resolve => {
            let data = await fetchLB(game, this.options[platform.toLowerCase() + 'LbURL'], platform);
            resolve(data);
        });
    };


    /**
     * Refines raw leaderboard data from the Mineplex website into an array of objects
     * @param {String} data The raw data to refine
     * @param {String} platform The platform from which the data originated
     * @returns 
     */
    refineData(data, platform) {
        return new Promise(resolve => {
            let result = refineResults(data, platform);
            resolve(result);
        });
    };
};

async function callLB(gamesDB, platform, providedLink, DB, reuseData, logData) {
    return new Promise(async resolve => {
        const gamesList = await gamesDB.get(platform);

        let resultsObject = {};
        let gameCount = 1;

        gamesList.forEach(async gameObject => {
            let results = [];
            const game = gameObject.name;
            let gName = game == 'Old Castle Defense' ? 'global' : game

            if (gameObject.active && !!DB && reuseData) {
                results = await fetchLB(gName, providedLink, platform);
            } else {
                results = DB.get(platform, 'current')?.[game];
                if (results == undefined || results == []) {
                    results = await fetchLB(gName, providedLink, platform);
                }
            };

            if (results.length != 100) {
                for (i = 0; i < 100; i++) {
                    if (!results[i]) {
                        let value;
                        if (!results[i]) value = {"position":i+1,"username":"x","wins":0};
                        results.push(value);
                    }
                };
            }

            resultsObject[game] = results;

            gameCount++;

            if (gameCount == gamesList.length) {
                if (logData) console.log(prefix + `Successfully downloaded and parsed ${platform} leaderboards on ${new Date().toDateString()} at ${new Date().toLocaleTimeString()}`)
                setTimeout(() => resolve(resultsObject), 60000);
            };
        });
    })
};

async function fetchLB(gameName, providedLink, platform) {
    let name = platform == 'bedrock' ? gameName.toLowerCase().split(/ +/).join('_') : gameName.toLowerCase().split(/ +/).join('%20');
    let link = providedLink.replace('$gameName', name);
    var res = (await axios.get(link).catch(err => console.error('Error getting LB:\n' + err)))?.data;
    var refined = refineResults(res, platform);
    res = null;
    
    return refined;
};

function refineResults(res, platform) {
    const dom = new JSDOM(res);

    if (platform == 'bedrock' || platform != 'java') {
        return Array.from(dom.window.document.querySelectorAll('tr')).slice(1).map(row => {
            const [positionEl, usernameEl, winsEl] = row.querySelectorAll("td"); 

            return {
                position: parseInt(positionEl.textContent),
                username: usernameEl.textContent,
                wins: parseInt(winsEl.textContent.replace(',', ''))
            };
        });
    } else if (platform == 'java') {
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
};

module.exports = MPStatsClient;
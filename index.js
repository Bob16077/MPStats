const Enmap = require('enmap');
const schedule = require('node-schedule');
const getBedrockLB = require('./getBedrockLB.js').execute;
const getJavaLB = require('./getJavaLB.js').execute;

const blbs = new Enmap({name: 'blbs', dataDir: '/root/data/mpstats'});
const jlbs = new Enmap({name: 'jlbs', dataDir: '/root/data/mpstats'});
const games = new Enmap({
    name: 'games', 
    dataDir: '/root/data/mpstats',
    autoEnsure: {
        bedrock: [],
        java: [],
    }
});

const bCommandLB = new Enmap({
	name: 'bCommandLB',
	autoEnsure: {
		'current': [],
		'daily': [],
		'weekly': [],
		'monthly': [],
		'yearly': []
	}, dataDir: '/root/data/mpstats'
});

const jCommandLB = new Enmap({
	name: 'jCommandLB', 
	autoEnsure: {
		'current': [],
		'daily': [],
		'weekly': [],
		'monthly': [],
		'yearly': []
	}, dataDir: '/root/data/mpstats'
});

convert(); //from old DB format to new

async function convert() {
    const lb = JSON.parse(new Enmap({name: 'lbs', dataDir: '/root/Bots/StatsBot/data'}).export()).keys;

	lb.forEach(key => {
		bCommandLB.set('current', key.value, key.key)
		console.log(key.key, key.value)
	})
};

getBedrockLB(games, bCommandLB, 'current');
getJavaLB(games, jCommandLB, 'current');

setInterval(async() => {
    await getBedrockLB(games, bCommandLB, 'current');
}, 900000);

setInterval(async() => {
    await getJavaLB(games, jCommandLB, 'current');
}, 3600000);

setInterval(async() => {
    process.exit();
}, 3590000)

schedule.scheduleJob('50 23 * * *', () => { 
    console.log('daily1')
    getBedrockLB(games, blbs);
    getJavaLB(games, jlbs);
});

schedule.scheduleJob('0 0 * * *', () => { 
    console.log('daily2')
    setTimeout(() => {
        getBedrockLB(games, bCommandLB, 'daily');
        getJavaLB(games, jCommandLB, 'daily');
    }, 60000);
});

schedule.scheduleJob('30 23 * * 6', () => {
    setTimeout(async () => {
        await getBedrockLB(games, bCommandLB, 'weekly');
        await getJavaLB(games, jCommandLB, 'weekly');
    });
});

schedule.scheduleJob('0 0 0 * *', () => {
    setTimeout(async () => {
        await getBedrockLB(games, bCommandLB, 'monthly');
        await getJavaLB(games, jCommandLB, 'monthly');
    }, 60000);
});

schedule.scheduleJob('0 0 1 1 *', async () => {
    const bedrock = await bCommandLB.get('yearly');
    const java = await jCommandLB.get('yearly');
    await blbs.set(new Date().getFullYear() - 1, bedrock);
    await jlbs.set(new Date().getFullYear() - 1, java);

    setTimeout(async () => {
        await getBedrockLB(games, bCommandLB, 'yearly');
        await getJavaLB(games, jCommandLB, 'yearly');
    }, 120000);
});


//const bgames = require('../PostgreSQL/dbdata/bgames.json');
//const blbFiles = require('../PostgreSQL/dbdata/blbs.json');
//const blbids = require('../PostgreSQL/dbdata/blbids.json');
//const bplayers = require('../PostgreSQL/dbdata/bplayers.json');

//json(); //convert json data from timmi's bot to my format

async function json() {
	const timestamps = [];
	for (const leaderboard of blbids) {
		const time = new Date(leaderboard.save_time);
		timestamps.push(time);
	};
    
    let uniqueDates = timestamps.reduce((acc, date) => {
        let day = date.getUTCDate();
        let month = date.getUTCMonth();
        let year = date.getUTCFullYear();
        let key = `${month}-${day}-${year}`;
        if (!acc[key]) {
            acc[key] = date;
        }
        return acc;
    }, {});

    let uniqueTimestamps = Object.values(uniqueDates).sort((a, b) => a - b);

	let lbs = {};

    //console.log(uniqueTimestamps.map(date => date.toLocaleString()).join('\n')) //view all uniqueTimestamps in console
	
	for (const timestamp of uniqueTimestamps) {
		let lb = {};
		let exactTime = blbids.find(object => new Date(object.save_time).getTime() == timestamp.getTime()).save_time;
		const time = new Date(exactTime);

		for (let gameObject of games.get('bedrock')) {	
            let game = gameObject.name;
			//const gameTime = getClosestDate(timestamps.map(a => new Date(a).getTime()), timestamp.getTime());
			const gameId = bgames.find(object => object.clean_name == game)?.id;

			const providedTimestamp = time.toString();
			const providedValue = gameId;
			let dataFromDB = blbids.reduce((acc, obj) => {
                if (obj.leaderboard_id !== providedValue) {
                    return acc;
                }
                if (!acc) {
                    return obj;
                }
                let diff = Math.abs(new Date(obj.save_time) - new Date(providedTimestamp));
                let accDiff = Math.abs(new Date(acc.save_time) - new Date(providedTimestamp));
                if (diff < accDiff) {
                    return obj;
                }
                return acc;
            }, blbids[0]);

            //console.log(dataFromDB)

			//let gameFromDB = bgames.find(object => object.id == gameId)?.clean_name;
			if (game == null || !games.get('bedrock')) console.log(gameId)
			const lbId = dataFromDB.id;
			const rawLb = blbFiles.filter(object => object.leaderboard_save_id == lbId);

			lb[game] = [];

			for (const row of rawLb) {
				lb[game].push({position: null, username: bplayers.find(player => player.id == row.player_id).player_name, wins: row.score});
			};

			lb[game] = lb[game].sort((a, b) => b.wins - a.wins).map((object, index) => (object.position = index + 1, object));
			//lb[game] = lb[game].slice(0, 2);
		}
		lbs[time.getTime()] = lb;
		//console.log(time.getTime(), lb.toString().slice(0, 15));
        console.log('Number ' + Object.keys(lbs).length + ' on ' + time.toLocaleString());
		blbs.set(String(time.getTime()), lb)
	};
	console.log(`Converted all ${Object.keys(lbs).length} bedrock leaderboards`);
};
const Enmap = require('enmap');
const schedule = require('node-schedule');
const getBedrockLB = require('./getBedrockLB.js').execute;
const getJavaLB = require('./getJavaLB.js').execute;

const blbs = new Enmap({name: 'blbs', dataDir: '/root/data/'});
const jlbs = new Enmap({name: 'jlbs', dataDir: '/root/data/'});
const games = new Enmap({
    name: 'games', 
    dataDir: '/root/data/',
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
	}, dataDir: '/root/data/'
});

const jCommandLB = new Enmap({
	name: 'jCommandLB', 
	autoEnsure: {
		'current': [],
		'daily': [],
		'weekly': [],
		'monthly': [],
		'yearly': []
	}, dataDir: '/root/data/'
});

getBedrockLB(games, bCommandLB, 'current');
getJavaLB(games, jCommandLB, 'current');

setInterval(async() => {
    await getBedrockLB(games, bCommandLB, 'current');
}, 900000);

setInterval(async() => {
    await getJavaLB(games, jCommandLB, 'current');
}, 1800000);

schedule.scheduleJob('0 0 * * *', () => { 
    setTimeout(async () => {
        await getBedrockLB(games, blbs);
        await getJavaLB(games, jlbs);

        await getBedrockLB(games, bCommandLB, 'daily');
        await getJavaLB(games, jCommandLB, 'daily');
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
# MPStats

MPStats is a powerful package created to aid with downloading and parsing the leaderboards for a Minecraft server/network called Mineplex. These leaderboards are publicly available on the Mineplex website and are free to download and interpret.

## Installation

Use the Node Package Manager [npm](https://www.npmjs.com/package/mpstats) to install MPStats.

```bash
npm install mpstats
```

## Usage

```js
const MPStats = require('mpstats');
const mpstats = new MPStats({bedrockLbInterval: 900000});

const Enmap = require('enmap');
const DB = new Enmap({name: 'test'})

mpstats.startCycle('current', DB);
//Starts a cycle in which MPStats gets, parses, and saves to a provided Enmap database the leaderboards for bedrock and/or java edition leaderboards every 900000 milliseconds.

mpstats.getLB('Cake Wars', 'bedrock');
//Returns the current Bedrock Cake Wars leaderboard as an array of objects

mpstats.saveLB('current', 'bedrock', DB);
//Saves all leaderboards for a given platform one single time to a provided Enmap database as key 'current'
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

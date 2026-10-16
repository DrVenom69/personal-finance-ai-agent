const cf = require('./facts.js');
let s = ''; process.stdin.on('data', d => s += d).on('end', () => process.stdout.write(JSON.stringify(JSON.parse(s).map(cf))));

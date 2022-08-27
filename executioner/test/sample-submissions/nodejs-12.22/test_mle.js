const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  const bulk = ['bulk'];
  while (true) {
    // Because nodejs times out before running out memory sometimes
    // And unexpected behaviour whilst testing sucks
    bulk.push(bulk.slice(0));
    bulk.push(bulk.slice(0));
    bulk.push(bulk.slice(0));
    bulk.push(bulk.slice(0));
    bulk.push(bulk.slice(0));
    bulk.push(bulk.slice(0));
  }
});

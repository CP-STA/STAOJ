const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  console.log(input);
  process.exit();
});

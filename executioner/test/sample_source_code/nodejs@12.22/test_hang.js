const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', async (input) => {
  console.log(input);
  await new Promise((resolve) => setTimeout(resolve, 100000))
});
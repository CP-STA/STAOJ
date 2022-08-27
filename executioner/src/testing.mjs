import { TestInterface } from './interfaces/test-interface.mjs';

async function run() {
  const app = new TestInterface();

  app.onMessageSent(() => {});
  setTimeout(() => {
    app.sendMessage({ state: 'done' });
  }, 1000);
  await app.submissionComplete();
  console.log('done');
}

run();
run();
run();

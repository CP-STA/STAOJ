import test from 'ava';
import path from 'path';
import { thisPath, filesFromRequests, testProblem } from './globals.mjs';
import { parseRequests } from './request-parser.mjs';
import { TestInterface } from '../src/interfaces/test-interface.mjs';
import { runExecutioner } from '../src/executioner.mjs';
import { state } from '../src/utils/types/message.mjs';

// Silence standard logging
console.log = () => {};

test('Testing queuing in executioner', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const request1 = { ...requestBase };
  const request2 = { ...requestBase };

  request1.id = 1;
  request2.id = 2;

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 1,
    })
  );

  // Push the requests once executioner has accquinted itself
  app.pushSubmission(request1);
  app.pushSubmission(request2);

  // Wait for the last messages to send
  await Promise.all([
    app.submissionComplete(request1.id),
    app.submissionComplete(request2.id),
  ]);

  // Get the order of the messages in output
  const request1Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request1.id
  );

  const request2Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request2.id
  );

  // Assert that they exist
  t.not(request1Done, -1, "Request 1's done message not found");
  t.not(request2Executing, -1, "Request 2's executing message not found");

  // Assert that they came in the right order
  const result = await t.try((tt) => {
    if (
      !tt.true(
        request1Done < request2Executing,
        'Request 2 did not execute synchronously after request 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.is(
        request2Executing - request1Done,
        1,
        'Difference between request 1 and request 2 is greater than 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      return;
    }
  });
  result.commit({ retainLogs: true });
});

test('Testing simultaneous execution in executioner', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const request1 = { ...requestBase };
  const request2 = { ...requestBase };

  request1.id = 3;
  request2.id = 4;

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 2,
    })
  );

  // Push the request once executioner has accquinted itself
  app.pushSubmission(request1);
  app.pushSubmission(request2);

  // Wait for the last messages to send
  await Promise.all([
    app.submissionComplete(request1.id),
    app.submissionComplete(request2.id),
  ]);

  // Get the order of messages in output array
  const request1Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request1.id
  );

  const request2Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request2.id
  );

  // Assert they exist
  t.not(request1Done, -1, "Request 1's done message not found");
  t.not(request2Executing, -1, "Request 2's executing message not found");

  // Assert that they did not occur one after the other
  const result = await t.try((tt) => {
    if (
      !tt.true(
        request1Done > request2Executing,
        'Request 2 did not execute simulatenously with request 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
    }
  });
  result.commit({ retainLogs: true });
});

test('Testing simultaneous execution and queuing in executioner', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const request1 = { ...requestBase };
  const request2 = { ...requestBase };
  const request3 = { ...requestBase };

  request1.id = 5;
  request2.id = 6;
  request3.id = 7;

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 2,
    })
  );

  // Push the requests once executioner has accquinted itself
  app.pushSubmission(request1);
  app.pushSubmission(request2);
  app.pushSubmission(request3);

  // Wait for the last messages to send
  await Promise.all([
    app.submissionComplete(request1.id),
    app.submissionComplete(request2.id),
    app.submissionComplete(request3.id),
  ]);

  // Get the order of the messages in output
  const request1Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request1.id
  );

  const request2Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request2.id
  );

  const request2Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request2.id
  );

  const reqeust3Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request3.id
  );

  // Assert that they exist
  t.not(request1Done, -1, "Request 1's done message not found");
  t.not(request2Executing, -1, "Request 2's executing message not found");
  t.not(request2Done, -1, "Request 2's done message not found");
  t.not(reqeust3Executing, -1, "Request 3's executing message not found");

  // Assert that the first 2 executed simultaneously and that the third queued
  const result = await t.try((tt) => {
    if (
      !tt.true(
        request1Done > request2Executing,
        'Request 2 did not execute simulatenously with request 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${reqeust3Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.true(
        reqeust3Executing > request2Done || reqeust3Executing > request1Done,
        'Request 3 did not queue whilst request 1 and 2 excuted'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${reqeust3Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
  });
  result.commit({ retainLogs: true });
});

test('Testing multiple queuing in executioner', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const request1 = { ...requestBase };
  const request2 = { ...requestBase };
  const request3 = { ...requestBase };

  request1.id = 8;
  request2.id = 9;
  request3.id = 10;

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 1,
    })
  );

  // Push the requests once executioner has accquinted itself
  app.pushSubmission(request1);
  app.pushSubmission(request2);
  app.pushSubmission(request3);

  // Wait for the last messages to send
  await Promise.all([
    app.submissionComplete(request1.id),
    app.submissionComplete(request2.id),
    app.submissionComplete(request3.id),
  ]);

  // Get the order of the messages in output
  const request1Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request1.id
  );

  const request2Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request2.id
  );

  const request2Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request2.id
  );

  const request3Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request3.id
  );

  // Assert that they exist
  t.not(request1Done, -1, "Request 1's done message not found");
  t.not(request2Executing, -1, "Request 2's executing message not found");
  t.not(request2Done, -1, "Request 2's done message not found");
  t.not(request3Executing, -1, "Request 3's executing message not found");

  // Assert that they came in the right order
  const result = await t.try((tt) => {
    if (
      !tt.true(
        request1Done < request2Executing,
        'Request 2 did not execute synchronously after request 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.is(
        request2Executing - request1Done,
        1,
        'Difference between request 1 and request 2 is greater than 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      return;
    }
    if (
      !tt.true(
        request2Done < request3Executing,
        'Request 3 did not execute synchronously after request 2'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.is(
        request3Executing - request2Done,
        1,
        'Difference between request 2 and request 3 is greater than 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      return;
    }
  });
  result.commit({ retainLogs: true });
});

test('Testing simultaneous execution and multiple queuing in executioner', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const request1 = { ...requestBase };
  const request2 = { ...requestBase };
  const request3 = { ...requestBase };
  const request4 = { ...requestBase };

  request1.id = 11;
  request2.id = 12;
  request3.id = 13;
  request4.id = 14;

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 2,
    })
  );

  // Push the requests once executioner has accquinted itself
  app.pushSubmission(request1);
  app.pushSubmission(request2);
  app.pushSubmission(request3);
  app.pushSubmission(request4);

  await Promise.all([
    app.submissionComplete(request1.id),
    app.submissionComplete(request2.id),
    app.submissionComplete(request3.id),
    app.submissionComplete(request4.id),
  ]);

  // Get the order of the messages in output
  const request1Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request1.id
  );

  const request2Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request2.id
  );

  const request2Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request2.id
  );

  const request3Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request3.id
  );

  const request3Done = messages.findIndex(
    (message) => message.state === state.done && message.id === request3.id
  );

  const request4Executing = messages.findIndex(
    (message) => message.state === state.executing && message.id === request4.id
  );

  // Assert that they exist
  t.not(request1Done, -1, "Request 1's done message not found");
  t.not(request2Executing, -1, "Request 2's executing message not found");
  t.not(request2Done, -1, "Request 2's done message not found");
  t.not(request3Executing, -1, "Request 3's executing message not found");
  t.not(request3Done, -1, "Request 3's done message not found");
  t.not(request4Executing, -1, "Request 4's executing message not found");

  // Assert that the first 2 executed simultaneously and that the next 2 queued, with the 4th executing last
  const result = await t.try((tt) => {
    if (
      !tt.true(
        request1Done > request2Executing,
        'Request 2 did not execute simulatenously with request 1'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      tt.log(`Request 3 done message in position: ${request3Done}`);
      tt.log(`Request 4 executing message in position: ${request4Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.true(
        request3Executing > request2Done || request3Executing > request1Done,
        'Request 3 did not queue whilst request 1 and 2 excuted'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      tt.log(`Request 3 done message in position: ${request3Done}`);
      tt.log(`Request 4 executing message in position: ${request4Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
    if (
      !tt.true(
        request4Executing > request2Done ||
          request4Executing > request1Done ||
          request4Executing > request3Done,
        'Request 4 did not queue whilst request 3 and request 1 or 2 excuted'
      )
    ) {
      tt.log(`Request 1 done message in position: ${request1Done}`);
      tt.log(`Request 2 executing message in position: ${request2Executing}`);
      tt.log(`Request 2 done message in position: ${request2Done}`);
      tt.log(`Request 3 executing message in position: ${request3Executing}`);
      tt.log(`Request 3 done message in position: ${request3Done}`);
      tt.log(`Request 4 executing message in position: ${request4Executing}`);
      tt.log(
        'Here are the messages:',
        messages.map((message) => `${message.id}: ${message.state}`)
      );
      return;
    }
  });
  result.commit({ retainLogs: true });
});

test('Stress testing queuing', async (t) => {
  const requestType = 'testAccepted';
  const requestLanguage = 'gpp-11.3';
  const requestBase = (
    await parseRequests(testProblem.name, [requestType], [requestLanguage])
  )[requestLanguage][requestType];

  const requestBases = new Array(8).fill(requestBase);
  const requests = requestBases.map((request, i) => ({
    ...request,
    id: 15 + i,
  }));

  const messages = [];

  // Set test interface to push all messages to array
  const app = new TestInterface({
    handleMessageSent: (message) => messages.push(message),
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'queue'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestType],
      checkPodman: false,
      executingLimit: 1,
    })
  );

  // Push the requests once executioner has accquinted itself
  requests.forEach(app.pushSubmission);

  await Promise.all(
    requests.map((request) => app.submissionComplete(request.id))
  );

  const messageIndexes = requests.map((request) => ({
    [state.executing]: messages.findIndex(
      (message) =>
        message.state === state.executing && message.id === request.id
    ),
    [state.done]: messages.findIndex(
      (message) => message.state === state.done && message.id === request.id
    ),
  }));

  // Assert that they exist
  messageIndexes.forEach((message, i) => {
    t.not(
      message[state.executing],
      -1,
      `Request ${i + 1}'s executing message not found`
    );
    t.not(message[state.done], -1, `Request ${i + 1}'s done message not found`);
  });

  // Assert that the first 2 executed simultaneously and that the next 2 queued, with the 4th executing last
  const result = await t.try((tt) => {
    for (let i = 1; i < messageIndexes.length; i++) {
      if (
        !tt.true(
          messageIndexes[i - 1][state.done] <
            messageIndexes[i][state.executing],
          `Request ${i + 1} did not execute synchronously with request ${i}`
        )
      ) {
        tt.log(
          `Request ${i} done message in postion: ${
            messageIndexes[i - 1][state.done]
          }`
        );
        tt.log(
          `Request ${i + 1} executing message in postion: ${
            messageIndexes[i][state.done]
          }`
        );
        tt.log(
          'Here are the messages:',
          messages.map((message) => `${message.id}: ${message.state}`)
        );
        return;
      }
      if (
        !tt.is(
          messageIndexes[i][state.executing] -
            messageIndexes[i - 1][state.done],
          1,
          `Difference between request ${i} and request ${
            i + 1
          } is greater than 1`
        )
      ) {
        tt.log(
          `Request ${i} done message in postion: ${
            messageIndexes[i - 1][state.done]
          }`
        );
        tt.log(
          `Request ${i + 1} executing message in postion: ${
            messageIndexes[i][state.done]
          }`
        );
        tt.log(
          'Here are the messages:',
          messages.map((message) => `${message.id}: ${message.state}`)
        );
        return;
      }
    }
  });
  result.commit({ retainLogs: true });
});

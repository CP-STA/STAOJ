# St Andrews Online Judge

The competitive programming contest platform. 

## Features
- Fast and reactive Frontend deployed on Vercel
- Sandboxed code submission execution and judgement

## Developing & Contributing
There are several areas you can work on, depending on your interest. The frontend, the executioner (the name for our sandbox unit), and writing problems. These units are faily independent and they talk to each other with interfaces specified in [`docs/Interface Specifications.md`](docs/Interface%20Specifications.md). If you want to find something to work on, please see the github issues.

### Writing Problems
For obvious reasons, you can't just open a PR in our problem repo to contribute new problems. Please tag @Committee on our [discord](https://discord.gg/5FsjrdEwzE) if you want to contribute and we'll add you to our private channel.

### Executioner
We use this as a sandbox environment. In essence, it uses podman to secure and isolate the runtime environment and uses `setrlimit` and `getrusage` to get the resource usage and judges the submission against correct answer and send the result to firebase for the frontend with code written in nodejs to display.

Please see [`executioner/README.md`](executioner/README.md) for more details.

### Frontend
We use svelte and connect it to dynamic elements to the firestore database to display the information and let users interact with the app.

Please see [`frontend/README.md`](frontend/README.md) for more details.


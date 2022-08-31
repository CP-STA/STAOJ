# STAOJ Frontend

This is the frontend of STAOJ developed with svelte and deployed on vercel. 

## Developing & Contributing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev
```

You will find that the local development version is automatically connected to the database (with firebase firestore and firebase auth). We know that this is not the best practice but it's fine for now. You are very encouraged to connect to your own firebase firestore so it's easier to develop and test. Creating and using a firestore is free to a certain quota limit. In my experience, this is more than enough for development.  

### Firebase

1. Create a Firebase account if you already haven't done so.
1. [Create a new Firebase project.](https://console.firebase.google.com/u/0/)

   - The project name doesn't matter. 
   - Google Analytics is not necessary.

1. [Configure your firebase project](https://firebase.google.com/docs/web/learn-more#config-object)
1. Replace `firebaseConfig` in `src/lib/firebase.ts` with your own configuration.
1. [Configure security rules](https://firebase.google.com/docs/firestore/security/get-started) to allow read and write. We don't have our security rules published. We might publish them in the future. As you are developing, just opening read and write for everything is fine.

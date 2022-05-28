# Devcontainer

In order to streamline the dev process and get over "it works on my machine" predicament, we will use the awesome vs code feature called devcontainer.

Essentially everyone will be developing in the same docker container. When we deploy it, we can just use the Dockerfile as a reference to set up the packages and dependencies at deployment.

To start, you need to have docker (not podman) installed. And install the Remote - Containers by Microsoft installed. Then open command pallet and choose `Remote-Container: Open Folder in Container`.

Before you push your changes to the repo, make sure you rebuild the container by (in command pallet) `Remote-Container: Rebuild Container` and run your setup / example code to test if it works. If it no longer works, check your dependencies and add them to the `Dockerfile` so other people can reuse your code.

Optionally, you can add your extensions to `devcontainer.json` by right clicking on the extension in the store and select `Add to devcontainer.json`
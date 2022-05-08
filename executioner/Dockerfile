FROM ubuntu:20.04
ARG EXER_SOCKET

# Add dependencies via package manager
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y gcc python3 curl
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm

# Update nodejs and npm
RUN npm cache clean -f && npm install -g n && n stable && hash -r && npm update npm -g

WORKDIR /app

# Copy the npm files and install the packages using the tarballs
COPY package.json package-lock.json *.tgz *.tgz .
RUN npm install *.tgz && rm -f *.tgz


ENV EXER_SOCKET=$EXER_SOCKET

# Copy the user created files like js and executioner script
COPY socket_interface.mjs  .

# Execute interface
CMD node socket_interface.mjs 


FROM ubuntu:22.04

# Add dependencies via package manager
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y make build-essential
RUN apt-get install -y openjdk-11-jre openjdk-11-jdk
RUN apt-get install -y ruby
RUN apt-get install -y nodejs
RUN apt-get install -y rustc
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y mono-complete
RUN apt-get install -y pypy3

WORKDIR /app

# Copy all container script files over
COPY container-scripts/* /app/

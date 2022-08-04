FROM ubuntu:22.04

# Add dependencies via package manager
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y make build-essential

WORKDIR /app

# Copy all container script files over
COPY container_scripts/* /app/

# Set the demoter conditions through env variables
ARG MAX_MEM
ARG MAX_TIME
ENV MAX_MEM=${MAX_MEM}
ENV MAX_TIME=${MAX_TIME}

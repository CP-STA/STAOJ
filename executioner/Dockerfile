FROM ubuntu:22.04
# Add dependencies via package manager
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y gcc python3 curl make

# Recompile demoter.out and delete everything else

WORKDIR /app

# Copy the npm files and install the packages using the tarballs
COPY measurer /app/
RUN rm -f demoter.out && make && rm -f Makefile README.md demoter.c

ARG MAX_MEM
ENV MAX_MEM=${MAX_MEM}
ARG MAX_TIME
ENV MAX_TIME=${MAX_TIME}

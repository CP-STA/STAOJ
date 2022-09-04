FROM alpine:latest

# Add dependencies via package manager
RUN apk add gcc make openjdk11 ruby nodejs rust
RUN apk add mono --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing

WORKDIR /app

# Copy all container script files over
COPY container-scripts/* /app/

FROM alpine:3.16

# Add dependencies via package manager
RUN apk add gcc make openjdk11 ruby nodejs rust curl
RUN apk add "mono=6.12.0.182-r0" --repository http://dl-cdn.alpinelinux.org/alpine/edge/testing

WORKDIR /app

# Copy all container script files over
COPY container-scripts/* /app/

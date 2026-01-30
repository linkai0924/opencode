FROM alpine AS base

# Disable the runtime transpiler cache by default inside Docker containers.
# On ephemeral containers, the cache is not useful
ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
RUN apk add libgcc libstdc++ ripgrep


FROM base AS build-amd64
# COPY dist/opencode-linux-x64-baseline-musl/bin/opencode /usr/local/bin/opencode
COPY dist/cs-linux-x64-baseline-musl.tar.gz /tmp/cs.tar.gz
RUN mkdir -p /tmp/cs && tar -xzf /tmp/cs.tar.gz -C /tmp/cs && \
    mv /tmp/cs/bin/cs /usr/local/bin/cs && \
    chmod +x /usr/local/bin/cs && \
    rm -rf /cs/cs.tar.gz /tmp/cs

FROM base AS build-arm64
# COPY dist/opencode-linux-arm64-musl/bin/opencode /usr/local/bin/opencode
COPY dist/cs-linux-arm64-musl.tar.gz /tmp/cs.tar.gz
RUN mkdir -p /tmp/cs && tar -xzf /tmp/cs.tar.gz -C /tmp/cs && \
    mv /tmp/cs/bin/cs /usr/local/bin/cs && \
    chmod +x /usr/local/bin/cs && \
    rm -rf /tmp/cs.tar.gz /tmp/cs

ARG TARGETARCH
FROM build-${TARGETARCH}
RUN cs --version
ENTRYPOINT ["cs"]

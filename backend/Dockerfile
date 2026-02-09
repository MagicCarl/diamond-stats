# Diamond Stats API - Multi-stage Docker build for Vapor 4

# ---- Build Stage ----
FROM swift:5.9-jammy AS build

WORKDIR /build

# Copy package files first for dependency caching
COPY Package.swift Package.resolved* ./
RUN swift package resolve

# Copy source and build
COPY Sources/ Sources/
COPY Tests/ Tests/

RUN swift build -c release --static-swift-stdlib

# ---- Run Stage ----
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /build/.build/release/App .

ENV ENVIRONMENT=production

EXPOSE 8080

ENTRYPOINT ["./App"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "8080"]

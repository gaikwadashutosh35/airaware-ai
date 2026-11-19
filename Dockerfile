# One Cloud Run service: Express serves /api/v1 and the built client (ADR-005).

# Build the client.
FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
# No package needs an install script (only macOS-only fsevents has one).
RUN npm ci --ignore-scripts
COPY shared shared
COPY client client
# Public Supabase settings, baked into the client (both optional: without
# them the client says saving isn't set up). Passed as build args in Phase 9.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build -w client

# Run the server. Node runs the TypeScript directly (type stripping).
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts --omit=dev -w server && npm cache clean --force
COPY server/src server/src
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 8080
CMD ["node", "server/src/server.ts"]

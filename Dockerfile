# Use Node.js LTS (Long Term Support)
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy patches directory (required for pnpm install)
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (Frontend + Backend)
RUN pnpm build

# --- Runtime Stage ---
FROM node:20-slim

WORKDIR /app

# Enable corepack
RUN corepack enable

# Copy package files for production dependency installation
COPY package.json pnpm-lock.yaml ./

# Copy patches directory (required for pnpm install)
COPY patches ./patches

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Migrações: o servidor aplica o que falta ao subir, então os .sql precisam
# estar na imagem.
COPY --from=builder /app/drizzle ./drizzle

# Expose the port (Cloud Run defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"]

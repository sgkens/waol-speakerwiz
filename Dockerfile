# Use official Bun image
FROM oven/bun:1 as builder

WORKDIR /app

# Copy the monorepo source
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/
COPY packages/react/package.json packages/react/
COPY demo/package.json demo/
COPY tsconfig.json ./

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

# Build the demo
RUN bun run build

# Use Nginx to serve the static built demo
FROM nginx:alpine
COPY --from=builder /app/dist-demo /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
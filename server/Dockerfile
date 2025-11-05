# Stage 1: Build the TypeScript code
FROM node:18 AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the TypeScript code into JavaScript
RUN npm run build

# Stage 2: Create the production image
FROM node:18-slim

WORKDIR /usr/src/app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled code and other necessary files from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD [ "node", "dist/index.js" ]

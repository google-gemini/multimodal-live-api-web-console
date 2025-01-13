# Use the official Node.js image as a base
FROM node:20 AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

COPY .env .env
RUN echo "REACT_APP_GEMINI_API_KEY='AIzaSyDqKEZAplofjA8tp5rhgPPqE9Hc91NccoY'" > .env

# Set environment variable for build
ARG REACT_APP_GEMINI_API_KEY
ENV REACT_APP_GEMINI_API_KEY=$REACT_APP_GEMINI_API_KEY

# Build the application
RUN npm run build

# ---- Production Stage ----
FROM node:20 AS production

WORKDIR /app

# Install serve to serve the static files
RUN npm install -g serve

# Copy the build files from the previous stage
COPY --from=build /app/build ./build

# Copy server.js (the code that also serves the build)
COPY --from=build /app/server.js .
# If you have privatekey.pem in your repo (not recommended for real production),
# copy that as well:
COPY --from=build /app/privatekey.pem .

# Pass the build arg to the production stage
ARG REACT_APP_GEMINI_API_KEY
ENV REACT_APP_GEMINI_API_KEY=$REACT_APP_GEMINI_API_KEY

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["serve", "-s", "build", "-l", "8080"]
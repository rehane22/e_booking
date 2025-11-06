FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies in a clean layer
COPY package*.json ./
RUN npm ci

# Copy the rest of the frontend sources and build the production bundle
COPY . .
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

# Copy a basic nginx configuration tailored for Angular's client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled Angular app from the build stage
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

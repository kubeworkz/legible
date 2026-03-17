FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --immutable
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4000

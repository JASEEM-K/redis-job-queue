FROM node:20.18.3-alpine3.21

WORKDIR /

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci
COPY src/ ./

RUN npm run build

ENV HOST=redis-server
ENV PORT=3000

EXPOSE 3000

# COPY index.js ./

CMD [ "node" ,"dist/server.js" ]

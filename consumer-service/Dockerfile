FROM node:20.18.3-alpine3.21

WORKDIR /app

COPY package*.json ./

RUN npm ci 

ENV HOST=redis-server

COPY index.js ./

EXPOSE 3001

CMD [ "node" , "index.js" ]
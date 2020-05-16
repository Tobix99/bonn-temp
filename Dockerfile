FROM node:14-slim

WORKDIR /usr/src/app
ADD ./webserver ./
RUN npm install

CMD [ "node", "/usr/src/app/index.js" ]

EXPOSE 80


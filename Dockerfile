FROM node:lts-buster

WORKDIR /usr/src/app
COPY . .

RUN yarn
RUN yarn build

EXPOSE 4000

CMD yarn start

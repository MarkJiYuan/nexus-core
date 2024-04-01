FROM node:18-alpine
WORKDIR /usr/src/app
RUN apk update
RUN apk add git
RUN chown node:node .
COPY --chown=node:node . .
USER node
RUN yarn install
RUN yarn build
ENTRYPOINT [ "yarn" ]
CMD [ "start" ]
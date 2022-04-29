FROM node:18-alpine as nginx-node-alpine
RUN apk add nginx
RUN adduser -D -g 'www' www
RUN mkdir /www
RUN chown -R www:www /var/lib/nginx
RUN chown -R www:www /www

FROM nginx-node-alpine as build-image
RUN apk add git g++ make vips-dev
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools


FROM build-image as build-joplin
RUN NPM_CONFIG_PREFIX=/app/joplin npm install -g joplin

FROM build-image as build-rest-api
ENV NODE_ENV=production
WORKDIR /app/rest-api
COPY ["node-server/package.json", "node-server/package-lock.json", "node-server/npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent
COPY node-server/ .

FROM nginx-node-alpine
RUN apk add vips
COPY --from=build-joplin /app/joplin /app/joplin
RUN ln -s /app/joplin/bin/joplin /usr/bin/joplin
# nginx
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
# REST api
ENV NODE_ENV=production
WORKDIR /app/rest-api
COPY --from=build-rest-api /app/rest-api .
EXPOSE 8081
# entrypoint / cmd

COPY entrypoint.sh /usr/bin
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "start", "--silent"]

#!/bin/sh
nginx -g 'daemon on;'
joplin server start&
cd /app/rest-api
npm start
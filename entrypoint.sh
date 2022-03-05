#!/bin/sh
nginx -g 'daemon on;'
joplin server start&

exec "$@"
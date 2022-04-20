# joplin-terminal-xapi
A docker image to interact with joplin-terminal server + some extended services

# dev tips
## how to add a node module
```bash
sudo docker container run -ti --name node_dev --rm --user $(id -u):$(id -g) -p 3000:3000 -v /home/gri/workspace/jolpin-vieweb/joplin-terminal-xapi/node-server/:/app/src node:17.6.0-alpine3.15 /bin/sh
cd /app/src
npm install --save child_process
rm -rf node_modules/
```

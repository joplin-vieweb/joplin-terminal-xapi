// From https://stackabuse.com/building-a-rest-api-with-node-and-express/
const express = require('express');
const app = express();
const port = 8081;

app.get("/ping", (req, res) => {
    res.send("joplin-terminal-xapi says pong");
});

app.get("/", (req, res) => {
    res.send("Welcome to joplin-terminal-xapi");
});

app.listen(port, () => console.log(`Joplin-terminal-xapi listening on port ${port}`))
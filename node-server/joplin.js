const express = require('express');
const router = express.Router();
const child_process = require('child_process');

router.get('/version', (req, res) => {
    var get_version = child_process.spawnSync("/app/joplin/bin/joplin", ["version"], { encoding : 'utf8' });
    if(get_version.error) {
        res.status(500).send(get_version.error);
        return;
    }
    
    res.send(get_version.stdout);
});

router.get('/config', (req, res) => {
    var get_synch_data = child_process.spawnSync("/app/joplin/bin/joplin", ["config"], { encoding : 'utf8' });
    if(get_synch_data.error) {
        res.status(500).send(get_synch_data.error);
        return;
    }
    
    const ini = require('ini');
    let config = ini.parse(get_synch_data.stdout);
    console.log(config);
    
    let target = config["sync.target"];
    let path = config["sync.5.path"];
    let user = config["sync.5.username"];
    let interval = config["sync.interval"];
    let password = config["sync.5.password"];
    
    res.json({
        'target': target ? parseInt(target) : 0,
        'path': path ? path : "",
        'user': user ? user : "",
        'interval': interval ? parseInt(interval) : 0,
        'password': password ? password : ''
    });
});

function set_joplin_conf(param, value) {
    var set_param = child_process.spawnSync("/app/joplin/bin/joplin", ["config", param, value], { encoding : 'utf8' });
    if(set_param.error) {
        console.error("failed to set joplin config " + param)
        return false;
    }

    console.info("Set joplin config " + param);
    return true;
}

router.post('/config', function(req, res){
    let target = req.body["sync.target"];
    let path = req.body["sync.5.path"];
    let user = req.body["sync.5.username"];
    let interval = req.body["sync.interval"];
    let password = req.body["sync.5.password"];

    if (target) set_joplin_conf("sync.target", target);
    if (path) set_joplin_conf("sync.5.path", path);
    if (user) set_joplin_conf("sync.5.username", user);
    if (password) set_joplin_conf("sync.5.password", password);
    if (interval) set_joplin_conf("sync.interval", interval);

    res.send({"status": true, "message": ""});
});

router.post('/config/test', async (req, res, next) => {
    const util = require('util');
    let path = req.body["sync.5.path"];
    let user = req.body["sync.5.username"];
    let password = req.body["sync.5.password"];
    
    try {
        if (!password) {
            const sqlite3 = require('sqlite3');
            const db = new sqlite3.Database("/root/.config/joplin/database.sqlite", sqlite3.OPEN_READONLY);
            const selectPromise = util.promisify(db.each);
            await selectPromise.call(db, "SELECT value from settings where key = 'sync.5.password'")
            .then(row => {
                if ("value" in row) {
                    password = row["value"];
                }
                else {
                    throw new Error("Please input password again");
                }
            })
            .catch(err => {throw new Error("Please input password again"); });
        }

        const createAdapter = require('webdav-fs');
        const wfs = createAdapter.createAdapter(path, {username: user, password: password});
        const writeFilePromise = util.promisify(wfs.writeFile);
        const statPromise = util.promisify(wfs.stat);
        const unlinkPromise = util.promisify(wfs.unlink);
        
        await writeFilePromise("__________POC", "")
        .then(data => {})
        .catch(err => { throw new Error("cannot create test file on nextcloud: " + err.toString()); } );
        
        await statPromise("__________POC")
        .then(data => {} )
        .catch(err => { throw new Error("cannot check test file on nextcloud: " + err.toString()); } );
        
        await unlinkPromise("__________POC")
        .then(data => {})
        .catch(err => { throw new Error("cannot delete test file on nextcloud: " + err.toString()); } );
        
        res.send({"status": true, "message": ""});
    }
    catch (err) {
        return res.send({"status": false, "message": err.message});
        // return res.status(500).send(err.message);
    }
});


module.exports = router;
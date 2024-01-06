const express = require('express');
const router = express.Router();
const child_process = require('child_process');
const sync = require('./synch');
const util = require('util');

function get_joplin_conf() {
    var get_synch_data = child_process.spawnSync("/app/joplin/bin/joplin", ["config"], { encoding : 'utf8' });
    if (get_synch_data.error) {
        return get_synch_data;
    }

    const ini = require('ini');
    let config = ini.parse(get_synch_data.stdout);
    console.log(config);
    
    let target = config["sync.target"];
    if (target) {
        target = parseInt(target);
    }
    else {
        target = 0;
    }
    let interval = config["sync.interval"];
    let path = ".";
    let user = ".";
    let password = ".";
    let s3bucket = ".";
    let s3region = ".";
    if (target == 5 || target == 9 || target == 6 || target == 8) {
        if (target != 8) {
            path = config["sync." + target.toString() + ".path"];
        }
        user = config["sync." + target.toString() + ".username"];
        password = config["sync." + target.toString() + ".password"];
        if (target == 8) {
            path = config["sync." + target.toString() + ".url"];
            s3bucket = config["sync." + target.toString() + ".path"];
            s3region = config["sync." + target.toString() + ".region"];
        }
    }

    get_synch_data.config = {
            'target': target,
            'path': path ? path : "",
            'user': user ? user : "",
            'interval': interval ? parseInt(interval) : 0,
            'password': password ? password : '',
            's3bucket': s3bucket ? s3bucket : '',
            's3region': s3region ? s3region : '',
        };

    return get_synch_data;
}

sync.set_interval(get_joplin_conf().config["interval"])

router.get('/version', (req, res) => {
    var get_version = child_process.spawnSync("/app/joplin/bin/joplin", ["version"], { encoding : 'utf8' });
    if(get_version.error) {
        res.status(500).send(get_version.error);
        return;
    }
    
    res.send(get_version.stdout);
});

router.get('/config', (req, res) => {
    var get_synch_data = get_joplin_conf();
    if(get_synch_data.error) {
        res.status(500).send(get_synch_data.error);
        return;
    }

    res.json(get_synch_data.config);
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
    let path = req.body["sync.path"];
    let user = req.body["sync.username"];
    let interval = req.body["sync.interval"];
    let password = req.body["sync.password"];
    let s3bucket = "";
    let s3region = "";
    if (target == "8") {
        s3bucket = req.body["sync.s3bucket"];
        s3region = req.body["sync.s3reigon"];
    }

    if (target) set_joplin_conf("sync.target", target);
    if (target == "5" || target == "9" || target == "6" || target == "8") {
        if (target != "8") {
            if (path) set_joplin_conf("sync." + target + ".path", path);
        }
        if (user) set_joplin_conf("sync." + target + ".username", user);
        if (password) set_joplin_conf("sync." + target + ".password", password);
        if (target == "8") {
            if (path) set_joplin_conf("sync." + target + ".url", path);
            if (s3bucket) set_joplin_conf("sync." + target + ".path", s3bucket);
            if (s3region) set_joplin_conf("sync." + target + ".region", s3region);
        }
    }
    if (interval) {
        set_joplin_conf("sync.interval", interval);
        sync.set_interval(parseInt(interval));
    }

    res.send({"status": true, "message": ""});
});

router.post('/config/test', async (req, res, next) => {
    let path = req.body["sync.path"];
    let user = req.body["sync.username"];
    let password = req.body["sync.password"];
    
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
    }
});

router.post('/synch', async (req, res) => {
    sync.start();
    res.send("Sync started")
});

router.get('/synch', async (req, res) => {
    try {
        let status = await sync.get_status();
        let output = await sync.get_output();
        let error = await sync.get_error();
        return res.send({
                            "info": status,
                            "output": output,
                            "error": error
                        });
    }
    catch (err) {
        return res.send({
            "info": "error",
            "output": "",
            "error": "error getting synch data"
        });
    }

});


module.exports = router;
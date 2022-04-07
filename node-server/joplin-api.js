var child_process = require('child_process');

module.exports = function(app){
    app.get("/joplin/version", (req, res) => {
        // var get_version = child_process.spawnSync("/app/joplin/bin/joplin", ["version"], { encoding : 'utf8' });
        var get_version = child_process.spawnSync("/app/joplin/bin/joplin", ["version"], { encoding : 'ascii' });
        
        if(get_version.error) {
            res.send("ERROR: " + get_version.error);
            return;
        }
        
        res.send(get_version.stdout);
    });
}

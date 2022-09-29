var spawn = require('child_process').spawn;
var Mutex = require('async-mutex').Mutex;
var CronJob = require('cron').CronJob;

class Sync {
    constructor() {
        this.status = "?";
        this.output = "";
        this.error = "";
        this.mutex = new Mutex();

        this.job = new CronJob('00 00 00 * * *', () => { this.start(); });
    }

    set_interval(interval) {
        this.job.stop();
        console.log("sync job stopped");
        let start = false;
        let cron_syntax = "";
        console.log("Set sync interval: " + interval);
        switch (interval) {
            case 300: // 5 minutes
                cron_syntax = '0 */5 * * * *';
                start = true;
                break;
            case 600: // 10 mintes
                cron_syntax = '0 */10 * * * *';
                start = true;
                break;
            case 1800: // 30 min
                cron_syntax = '0 */30 * * * *';
                start = true;
                break;
            case 3600: // 1 hour
                cron_syntax = '0 0 * * * *';
                start = true;
                break;
            case 43200: // 12 hours
                cron_syntax = '0 0 */12 * * *';
                start = true;
                break;
            case 86400: // 24 hours
                cron_syntax = '0 0 0 * * *';
                start = true;
                break;
        }
        if (start) {
            console.log("start sync job with cron " + cron_syntax);
            this.job = new CronJob(cron_syntax, () => { this.start(); });
            this.job.start();
        }
    }
    
    async start() {
        this.mutex.runExclusive(() => {
            if (this.status == "ongoing") {
                return;
            }
            this.status = "ongoing";
            this.output = "";
            this.error = "";
    
            let synch_command = spawn("node", ["--no-warnings", "/app/joplin/bin/joplin", "sync"], { encoding : 'utf8' });
            synch_command.stdout.setEncoding('utf8');
            synch_command.stderr.setEncoding('utf8');
            synch_command.stdout.on('data', async (data) => {this.on_output(data)});
            synch_command.stderr.on('data', async (data) => {this.on_output(data)});
            synch_command.on('close', async (code) => {this.on_sync_finished(code)});
        });
    }

    async on_output(data) {
        this.mutex.runExclusive(() => {
            this.output += data.toString();
        });
    }
    
    async on_error(data) {
        this.mutex.runExclusive(() => {
            this.error += data.toString();
        });
    }
    
    async on_sync_finished(code) {
        this.mutex.runExclusive(async () => {
            this.status = (new Date()).toISOString();
        }).then(async () => {
            console.log('Synch finished: return code: ' + code);
            let status = await this.get_status();
            let output = await this.get_output();
            let error = await this.get_error();
            console.log('    status: ' + status);
            console.log('    stdout: ' + output);
            console.log('    stderr: ' + error);
        });
    }
    
    async get_status() {
        let status = "no";
        await this.mutex.runExclusive(()=>{status = this.status});
        return status;
    }
    
    async get_output() {
        let out = "no";
        await this.mutex.runExclusive(()=>{out = this.output});
        return out;
    }
    
    async get_error() {
        let error = "no";
        await this.mutex.runExclusive(()=>{error = this.error});
        return error;
    }
}
  
module.exports = new Sync()

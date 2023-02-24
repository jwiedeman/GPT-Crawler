module.exports = {
    apps: [
      {
        name: 'bot_nolinkcollection_1',
        script: 'bot_cheerio.js',
        instances: 1,
      },
    ],
    watch: true,
    ignore_watch: ['node_modules', 'logs'],
    autorestart: true, // disable automatic restarts
    restart_delay: 30000,
  };
  
  // Function to kill and restart all processes
  function restartProcesses() {
    console.log('PM2: Restarting all processes...');
    const pm2 = require('pm2');
    pm2.connect(function(err) {
      if (err) {
        console.error(err);
        process.exit(2);
      }
      pm2.list(function(err, list) {
        if (err) {
          console.error(err);
          process.exit(2);
        }
        const processes = list.filter(process => process.name.startsWith('bot_nolinkcollection'));
        if (processes.length > 0) {
          pm2.delete(processes.map(process => process.name), function(err) {
            if (err) {
              console.error(err);
              process.exit(2);
            }
            pm2.start(module.exports, function(err) {
              if (err) {
                console.error(err);
                process.exit(2);
              }
              pm2.disconnect();
            });
          });
        }
      });
    });
  }
  
  // Set a timer to restart processes every 5 minutes
  const interval = setInterval(restartProcesses, 5 * 60 * 1000);
  
  // Add the command to monitor the PM2 process list and logs
  console.log('PM2: Starting process monitor...');
  console.log('PM2: To exit, press Control-C.');
  process.stdin.resume();
  
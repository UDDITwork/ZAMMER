// Save this file in your backend directory and run with: node check-port.js
const net = require('net');
const { exec } = require('child_process');
const os = require('os');

const PORT = 5000;

console.log(`Checking if port ${PORT} is available...`);

// Try to create a server on port 5000
const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    
    // Different commands for different operating systems
    let command = '';
    if (os.platform() === 'win32') {
      command = `netstat -ano | findstr :${PORT}`;
    } else {
      command = `lsof -i :${PORT} | grep LISTEN`;
    }
    
    console.log(`\nRunning: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Could not execute command: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`Command error: ${stderr}`);
        return;
      }
      
      if (stdout) {
        console.log('\nFound these processes using port 5000:');
        console.log(stdout);
        
        if (os.platform() === 'win32') {
          console.log('\nTo kill the process, run:');
          console.log('taskkill /F /PID <PID>');
        } else {
          console.log('\nTo kill the process, run:');
          console.log('kill <PID>');
        }
      } else {
        console.log('No specific process information found.');
      }
    });
  } else {
    console.error(`Error occurred: ${err.message}`);
  }
});

server.once('listening', () => {
  console.log(`✅ Port ${PORT} is available!`);
  server.close();
});

server.listen(PORT);
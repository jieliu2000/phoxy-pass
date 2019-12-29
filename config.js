/*
** Peteris Krumins (peter@catonmat.net)
** http://www.catonmat.net  --  good coders code, great reuse
**
** A simple proxy server written in node.js.
**
*/

var fs = require('fs');

var config = {
  add_proxy_header: false,//activate addition of X-Forwarded-For header for better logging on real server side

  target: {
    host: "localhost",
    port: "3232"
  },
  listen: [{ ip: '0.0.0.0', port: 80 },//all ipv4 interfaces
  { ip: '::', port: 80 }],//all ipv6 interfaces
  /** listen_ssl: [{
     ip: '0.0.0.0',//all *secure* ipv4 interfaces
     port: 443,
     key: fs.readFileSync('/path/to/ssl.key'),
     cert: fs.readFileSync('/path/to/ssl.crt'),
     ca: [fs.readFileSync('/path/to/ca.pem'),
     fs.readFileSync('/path/to/sub-ca.pem')]
   }, {
     ip: '::',//all *secure* ipv6 interfaces
     port: 443,
     key: fs.readFileSync('/path/to/ssl.key'),
     cert: fs.readFileSync('/path/to/ssl.crt'),
     ca: [fs.readFileSync('/path/to/ca.pem'),
     fs.readFileSync('/path/to/sub-ca.pem')]
 
   }
   ]*/
};

exports.config = config;


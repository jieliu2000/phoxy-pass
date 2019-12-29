const http = require('http');
const net = require('net');
const { URL } = require('url');
const config = require('./config');


function handleRequest(message, response) {

    //detect HTTP version
    var legacy_http = message.httpVersionMajor == 1 && message.httpVersionMinor < 1 || message.httpVersionMajor < 1;

    //launch new request + insert proxy specific header
    var headers = message.headers;
    if (config.add_proxy_header) {
        if (headers['X-Forwarded-For'] !== undefined) {
            headers['X-Forwarded-For'] = message.connection.remoteAddress + ", " + headers['X-Forwarded-For'];
        }
        else {
            headers['X-Forwarded-For'] = message.connection.remoteAddress;
        }
    }

    headers["Host"] = "localhost";
    //  headers["referer"] = "http://localhost:3232/index.html";

    var remoteServerConfig = {
        method: message.method,
        headers: headers,
        host: config.target.host,
        port: config.target.port,
        path: message.url
    };

    console.log(`Start to call remote server: ${remoteServerConfig.path}`);

    var proxy_request = http.request(remoteServerConfig);

    //deal with errors, timeout, con refused, ...
    proxy_request.on('error', function (err) {
        console.error(err.toString() + " on request to " + host);
        return action_notfound(response, "Requested resource (" + message.url + ") is not accessible on host \"" + host + "\"");
    });

    //proxies to FORWARD answer to real client
    proxy_request.on('response', function (proxy_response) {
        if (legacy_http && proxy_response.headers['transfer-encoding'] != undefined) {
            console.log("legacy HTTP: " + message.httpVersion);

            //filter headers
            var headers = proxy_response.headers;
            delete proxy_response.headers['transfer-encoding'];
            var buffer = "";

            //buffer answer
            proxy_response.addListener('data', function (chunk) {
                buffer += chunk;
            });
            proxy_response.addListener('end', function () {
                headers['Content-length'] = buffer.length;//cancel transfer encoding "chunked"
                response.writeHead(proxy_response.statusCode, headers);
                response.write(buffer, 'binary');
                response.end();
            });
        } else {
            //send headers as received
            response.writeHead(proxy_response.statusCode, proxy_response.headers);

            //easy data forward
            proxy_response.addListener('data', function (chunk) {
                response.write(chunk, 'binary');
            });
            proxy_response.addListener('end', function () {
                response.end();
            });
        }
    });

    //proxies to SEND request to real server
    message.on('data', function (chunk) {
        proxy_request.write(chunk, 'binary');
    });
    message.on('end', function () {
        proxy_request.end();
    });
}


config.listen.forEach(function (listen) {
    console.log(`Listen on ${listen.ip}, port ${listen.port}`);

    // Create an HTTP tunneling proxy
    const proxy = http.createServer(handleRequest);

    http.createServer(handleRequest).listen(listen.port, listen.ip);
    proxy.listen(config.listen.port, config.listen.ip);

});

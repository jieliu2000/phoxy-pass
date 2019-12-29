
var http = require('http'),
    https = require('https'),
    util = require('util'),
    fs = require('fs'),
    config = require('./config').config,
    blacklist = [],
    iplist = [],
    hostfilters = {};


function action_proxy(response, request, host) {
    util.log("Proxying to " + host);

    //detect HTTP version
    var legacy_http = request.httpVersionMajor == 1 && request.httpVersionMinor < 1 || request.httpVersionMajor < 1;

    //launch new request + insert proxy specific header
    var headers = request.headers;
    if (config.add_proxy_header) {
        if (headers['X-Forwarded-For'] !== undefined) {
            headers['X-Forwarded-For'] = request.connection.remoteAddress + ", " + headers['X-Forwarded-For'];
        }
        else {
            headers['X-Forwarded-For'] = request.connection.remoteAddress;
        }
    }
    var proxy = http.createClient(config.target.port, config.target.host);
    var requestUrl = request.url;
    var proxy_request = proxy.request(request.method, requestUrl, request.headers);

    //deal with errors, timeout, con refused, ...
    proxy.on('error', function (err) {
        util.log(err.toString() + " on request to " + host);
        return action_notfound(response, "Requested resource (" + request.url + ") is not accessible on host \"" + host + "\"");
    });

    //proxies to FORWARD answer to real client
    proxy_request.addListener('response', function (proxy_response) {
        if (legacy_http && proxy_response.headers['transfer-encoding'] != undefined) {
            console.log("legacy HTTP: " + request.httpVersion);

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
    request.addListener('data', function (chunk) {
        proxy_request.write(chunk, 'binary');
    });
    request.addListener('end', function () {
        proxy_request.end();
    });
}

//encode host field
function encode_host(host) {
    return host.host + ((host.port == 80) ? "" : ":" + host.port);
}

//actual server loop
function server_cb(request, response) {

    if (!request) { return; }

    util.log(ip + ": " + request.method + " " + request.headers.host + "=>" + request.url);

    //calc new host info
    var action = handle_proxy_route(request.headers.host, authorization);
    host = encode_host(action);


    action_proxy(response, request, host);

}

//http
config.listen.forEach(function (listen) {
    util.log("Starting reverse proxy server on port '" + listen.ip + ':' + listen.port);
    http.createServer(server_cb).listen(listen.port, listen.ip);
});


//httpS
/*config.listen_ssl.forEach(function (listen) {
    util.log("Starting *secure* reverse proxy server on port '" + listen.ip + ':' + listen.port);
    var options = {
        cert: listen.cert,
        key: listen.key,
        ca: listen.ca
    }
    https.createServer(options, server_cb).listen(listen.port, listen.ip);
});
*/
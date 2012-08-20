var http = require('http');
var gcm = require('node-gcm');
var fs = require('fs');

//load settings from file, store it to a settings object
eval(fs.readFileSync('snapserver.settings', encoding="ascii"));

var message = new gcm.Message();
var sender = new gcm.Sender(settings.apikey);
var registrationIds = [];
var port = process.env.PORT || 1337; //get PORT for heroku else use 1337
var url = settings.url; //find a way to get this for heroku?
var urlport = url + ":" + port;
var storedreg = "";


//load from file and populate registrationIds
fs.readFile('registration_store', 'ascii', function(err, data){
    if(err) {
        console.log("no registration file found");
    } else {
        storedreg = data;
        storedreg = storedreg.split(",");
        console.log("loaded registrations from file:");
        for (x = 0; x < storedreg.length; x++){
            registrationIds.push(storedreg[x]);
            console.log(storedreg[x]);
        }
    }
});

http.createServer(function (req, res) {
    switch(req.url) { 
        case '/':
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Welcome to snapnotify-server! Your server is now running at: ' + urlport + '\n');
            break;
        case '/register':
            if (req.method == 'POST'){
                console.log('posted');
                recstr = "";
                req.on('data', function(chunk) {
                    recstr += chunk.toString();
                });
                req.on('end', function() {
                    res.writeHead(200, "OK", {'Content-Type': 'text/html'});
                    res.end();
                    recstr = recstr.slice(0, -1);
                    if (registrationIds.indexOf(recstr) == -1) {
                        registrationIds.push(recstr);
                        console.log("registered:");
                        console.log(recstr);
                    } else {
                        console.log("registration exists");
                    }
                    console.log("all registrations:");
                    console.log(registrationIds);
                    console.log("writing registration ids to file");
                    var stream = fs.createWriteStream("registration_store");
                    stream.once('open', function(fd) {
                        for (x = 0; x<(registrationIds.length-1); x++){
                            stream.write(registrationIds[x] + ",");
                        }
                        stream.write(registrationIds[registrationIds.length-1]);
                    });
                    console.log("writing complete");
                });
            } else {
                console.log("REGISTRATION FAILURE");
            }
            break;
        case '/message':
            if (req.method == 'POST') {
                console.log('posted');
                recstr = "";
                req.on('data', function(chunk) {
                    recstr += chunk.toString();
                });
    
                req.on('end', function() {
                    //empty ok
                    res.writeHead(200, "OK", {'Content-Type': 'text/html'});
                    res.end();
                    contArr = recstr.split(",");
                    title = contArr[0];
                    content = contArr[1];
                    console.log(title);
                    console.log(content);

                    //create gcm message
                    message.addData('title', title);
                    message.addData('content', content);
                    message.collapseKey = 'demo';
                    message.delayWhileIdle = true;
                    message.timeToLive = 3;

                    sender.send(message, registrationIds, 4, function (result) {
                        console.log(result);
                    });
                });
            } else {
                console.log("Uh oh, you should have used a POST.");
            }
            break;
        case '/setup':
            res.writeHead(200, "OK", {'Content-Type': 'text/html'});
            res.end("Currently just filler, will eventually show a qrcode for easy config.");
            break;
    };
}).listen(port, '0.0.0.0');
console.log('Server running at: ' + urlport);

var config = require("./server/config")
    , app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io')(server)
    , bodyParser = require('body-parser')
    , cors = require("cors")
    , web = require("./server/web")
    , socket = require("./server/socket");

app.use(bodyParser.urlencoded({extended: true, limit: "1mb"}));
app.use(bodyParser.json({limit: "1mb"}));
app.use(function (error, req, res, next) {
    if (error)
        res.sendStatus(500);
});


//(function (app) {
//}(app, web));

socket(io);

//Æô¶¯webserver
app.listen(config.webport, function () {
    console.log("web started at port ",config.webport)
});
//Æô¶¯socketserver
server.listen(config.socketport, function () {
    console.log("socket started at port ",config.socketport)
});

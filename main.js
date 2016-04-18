var  app = require('express')()
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


(function(app){
    //app.get("/url/:url",web.parseUrl)
}(app,web));

(function(io){
    io.on("connection",socket)
}(io,socket));

app.listen(3010,function(){console.log("web start at ported 3010")});
server.listen(3011,function(){console.log("socket start at port 3011")});

var dic = decodeURI(require("fs").readFileSync("dics/large")).split("\n").slice(0, 1000);
var splitNum = 100;
var dicGroup = arrSlice(dic, splitNum);
var dns = require("dns");
var db = require("./db");

module.exports = function (socket) {
    socket.on("DOMAIN", function (data) {
        var pos = 0;
        var t = +new Date();
        var url1 = data.url.toString() || "";
        var url2 = {};
        parseURL(url1).forEach(function (rawUrl) {
            url2[rawUrl] = [];
            socket.emit("DOMAIN_INFO", {domain: rawUrl, msg: "parse started"});
            db.urldb.find({domain: rawUrl}).select("-_id").exec(function (err, doc) {
                if (!err) {
                    if (!doc.length) {
                        dnsLook(dicGroup, socket, rawUrl, 0);
                    }
                    else {
                        socket.emit("DOMAIN_DATA", doc[0].subdomain);
                        socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});
                    }
                }
                else  socket.emit("DOMAIN_ERROR", {domain: rawUrl, msg: "db rong"});
            })
        });

        function dnsLook(arr, socket, rawUrl, i) {
            arr[i].forEach(function (item, index) {
                dns.lookup([item, rawUrl].join("."), 4, function (err, doc) {
                    pos++;
                    if (!err) {
                        var data = {ip: doc, url: item, domain: rawUrl};
                        socket.emit("DOMAIN_DATA", [data]);
                        url2[rawUrl].push(data)
                    }
                    if (index + 1 == arr[i].length && i + 1 < arr.length) {
                        dnsLook(arr, socket, rawUrl, i + 1);
                    }
                    if (+new Date() - t > 1000) {
                        t = +new Date();
                        socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: pos / dic.length})
                    }
                    if (pos == dic.length) {
                        socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});

                        db.urldb.findOneAndUpdate({domain: rawUrl}, {
                            subdomain: url2[rawUrl],
                            updated_at: Date.now()
                        }, {upsert: true}, function () {
                        })
                    }
                });
            })
        }
    })
};

function arrSlice(arr, len) {
    var l = arr.length;
    if (l <= len)
        return arr.map(function (v) {
            return [v]
        });
    var d = Math.floor(l / len);
    var r = [];
    for (var i = 0; i < len; i++)
        r.push(arr.slice(i * d, (i + 1) * d))
    return r;
}

function parseURL(urls) {
    return urls.split(",").filter(function (url) {
        url = url.replace(/^http(s)?:\/\/|\/\//g, "").split(".");
        if (url.length > 1) {
            var fix = url[url.length - 1];
            var host = url.slice(0, url.length - 1);
            return /^[a-zA-Z]{2,10}$/.test(fix) && host.every(function (item) {
                    return /^[0-9a-zA-Z]+(-?[0-9a-zA-Z])*$/.test(item)
                })
        }
        return false;
    }).map(function (url) {
        return url.replace(/^http(s)?:\/\/|\/\//g, "");
    })
}
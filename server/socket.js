var dic = decodeURI(require("fs").readFileSync("dics/large")).split("\n");
var splitNum = 100;
var dicGroup = arrSlice(dic, splitNum);
var dns = require("dns");
var db = require("./db");

module.exports = function (socket) {
    var task = {};
    socket.on("DOMAIN", function (data) {
        var url1 = data.url.toString() || "";
        parseURL(url1).forEach(function (rawUrl) {
            socket.emit("DOMAIN_INFO", {domain: rawUrl, msg: "parse started"});
            db.urldb.find({domain: rawUrl}).select("-_id").exec(function (err, doc) {
                if (!err) {
                    if (!doc.length) {
                        if (!task[rawUrl]) {
                            task[rawUrl] = {
                                pos: 0,
                                t: +new Date(),
                                domain: []
                            };
                            dnsLook(dicGroup, socket, rawUrl, 0);
                        }
                        else  if (!task[rawUrl].timer){
                                task[rawUrl].timer = setInterval(function () {
                                    if (task[rawUrl].pos != dic.length) {
                                        socket.emit("DOMAIN_DATA", task[rawUrl].domain);
                                        socket.emit("DOMAIN_PROGRESS", {
                                            domain: rawUrl,
                                            pos: task[rawUrl].pos / dic.length
                                        })
                                    }
                                    else {
                                        clearInterval(task[rawUrl].timer);
                                        socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1})
                                    }
                                }, 1000)
                        }
                    }
                    else {
                        socket.emit("DOMAIN_DATA", doc[0].subdomain);
                        socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});
                    }
                }
                else  socket.emit("DOMAIN_ERROR", {domain: rawUrl, msg: "db wrong"});
            });

            function dnsLook(arr, socket, rawUrl, i) {
                arr[i].forEach(function (item, index) {
                    dns.lookup([item, rawUrl].join("."), 4, function (err, doc) {
                        task[rawUrl].pos++;
                        if (!err && !/202\.106\.199/.test(doc)) {
                            var data = {ip: doc, url: item, domain: rawUrl};
                            socket.emit("DOMAIN_DATA", [data]);
                            task[rawUrl].domain.push(data)
                        }
                        if (index + 1 == arr[i].length && i + 1 < arr.length) {
                            dnsLook(arr, socket, rawUrl, i + 1);
                        }
                        if (+new Date() - task[rawUrl].t > 1000) {
                            task[rawUrl].t = +new Date();
                            socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: task[rawUrl].pos / dic.length})
                        }
                        if (task[rawUrl].pos == dic.length) {
                            socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});

                            db.urldb.findOneAndUpdate({domain: rawUrl}, {
                                subdomain: task[rawUrl].domain,
                                updated_at: Date.now()
                            }, {upsert: true}, function () {
                                delete task[rawUrl];
                            })
                        }
                    });
                })
            }
        });
    })
};

function arrSlice(arr, len) {
    var l = arr.length;
    if (l <= len)
        return arr.map(function (v) {
            return [v]
        });
    var d = Math.floor(l / len);
    var le = l % len;
    var r = [];
    for (var i = 0; i < len; i++)
        r.push(arr.slice(i * d, (i + 1) * d))
    r[r.length - 1] = r[r.length - 1].concat(arr.slice(-le));
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
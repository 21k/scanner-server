var dic = decodeURI(require("fs").readFileSync("dics/large")).split("\n").slice(0, 1000);
var splitNum = parseInt(dic.length/4);
var dicGroup = arrSlice(dic, splitNum);
var dns = require("dns");
var db = require("./db");
var task = {};


module.exports = function (io) {
    io.on("connection", function (socket) {
        socket.on("DOMAIN", function (data) {
            var url1 = data.url.toString().replace(/^http(s)?:\/\/|\/\//g, "").toLowerCase() || "";
            parseURL(url1).forEach(function (rawUrl) {
                socket.emit("DOMAIN_INFO", {domain: rawUrl, msg: "parse started"});
                db.urldb.find({domain: rawUrl}).exec(function (err, doc) {
                    if (!err) {
                        if (!doc.length) {//没有查询过
                            if (!task[rawUrl]) {//记录任务和订阅者
                                task[rawUrl] = {
                                    t: +new Date(),
                                    domain: [],
                                    conn: {}
                                };
                                task[rawUrl].conn[socket.id] = socket;


                                //判断存在泛解析不
                                dns.lookup([randomChar(), rawUrl].join("."), 4, function (err) {
                                    if (err) {
                                        dnsLook(dicGroup, rawUrl, 0);
                                      //  nextDns(rawUrl,0)

                                    } else {//存在泛解析
                                        dns.lookup(rawUrl, 4, function (err, doc) {
                                            var ip = doc ? doc : "0.0.0.0";
                                            socket.emit("DOMAIN_DATA", [{ip: ip, url: "*", domain: rawUrl}]);
                                            socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});
                                            delete task[rawUrl];
                                        })
                                    }
                                });
                            }
                            else {//添加订阅
                                if (!task[rawUrl].conn[socket.id])
                                    task[rawUrl].conn[socket.id] = socket;
                                socket.emit("DOMAIN_DATA", task[rawUrl].domain);
                            }
                        }
                        else {//已经查询过

                            socket.emit("DOMAIN_DATA", doc[0].subdomain);
                            socket.emit("DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});
                        }
                    }
                    else  socket.emit("DOMAIN_ERROR", {domain: rawUrl, msg: "db wrong"});
                });
            });
        });

        socket.on("disconnect", function () {
            Object.keys(task).forEach(function (url) {
                if (task[url].conn[socket.id])
                    delete task[url].conn[socket.id];
            })
        })
    });


};

//大数组分片
function arrSlice(arr, len) {
    var l = arr.length;
    if (l <= len)
        return arr.map(function (v) {
            return [v]
        });
    var d = Math.floor(l / len);
    var left = l % len ? arr.slice(-l % len) : [];
    var r = [];
    for (var i = 0; i < len; i++)
        r.push(arr.slice(i * d, (i + 1) * d))
    r[r.length - 1] = r[r.length - 1].concat(left);
    return r;
}

function parseURL(urls) {
    return urls.split(",").filter(function (url) {
        return /^([a-z0-9]+(-?[0-9a-z]+)*\.)+[a-z]{2,32}$/.test(url)
    })
}

function dnsLook(arr, rawUrl, i) {
    var tmpindex = 0;
    arr[i].forEach(function (item, index) {

        dns.lookup([item, rawUrl].join("."), 4, function (err, doc) {
            tmpindex++;
           // console.log(rawUrl, i, tmpindex, arr[i].length);
            if (doc && !/202\.106\.199/.test(doc)) {
                var data = {ip: doc, url: item, domain: rawUrl};
                task[rawUrl].domain.push(data);
                sendMessage(rawUrl, "DOMAIN_DATA", [data]);
            }
            if (+new Date() - task[rawUrl].t > 1000) {
                task[rawUrl].t = +new Date();

                sendMessage(rawUrl, "DOMAIN_PROGRESS", {
                    domain: rawUrl,
                    pos: (i * Math.floor(dic.length / splitNum) + tmpindex) / dic.length
                });
            }
            //当前分片完成
            if (tmpindex == arr[i].length) {
                if (i + 1 < arr.length)
                    dnsLook(arr, rawUrl, i + 1);
                else { //所有分片完成
                    sendMessage(rawUrl, "DOMAIN_PROGRESS", {domain: rawUrl, pos: 1});

                    //保存记录
                    db.urldb.findOneAndUpdate({domain: rawUrl}, {
                        subdomain: task[rawUrl].domain,
                        updated_at: Date.now()
                    }, {upsert: true}, function () {
                        delete task[rawUrl];
                    })
                }
            }
        });
    })
}

//返回定长随机字符串
function randomChar(num) {
    var chars = "abcdefghijklmnopqrstuvwxyz";
    num = num || 8;
    for (var result = []; result.length < num;) {
        var tmp = chars[Math.round(Math.random() * (chars.length - 1))];
        result.push(Math.random() > 0.5 ? tmp : tmp.toUpperCase());
    }
    return result.join("");
}

function nextDns(rawUrl,i){
    dns.lookup([dic[i], rawUrl].join("."), 4, function (err, doc) {
      //  console.log(rawUrl,i)
        if (doc && !/202\.106\.199/.test(doc)) {
            var data = {ip: doc, url: dic[i], domain: rawUrl};
            task[rawUrl].domain.push(data);
            sendMessage(rawUrl, "DOMAIN_DATA", [data]);
        }
        sendMessage(rawUrl, "DOMAIN_PROGRESS", {
            domain: rawUrl,
            pos:i / dic.length
        });
        if(i<dic.length)
        nextDns(rawUrl,i+1)
    })
}
//向订阅者群播
function sendMessage(url, title, body) {
    Object.keys(task[url].conn).forEach(function (id) {
        task[url].conn[id].emit(title, body)
    })
}
var dic = decodeURI(require("fs").readFileSync("dics/dic")).replace(/\r/g, "").split("\n");
var splitNum = parseInt(dic.length / 4);
var dicGroup = arrSlice(dic, splitNum);
var dns = require("dns");
var dockerapis = require("./dockerapis");
var db = require("./db");
var config = require("./config");
var task = {};


module.exports = function (io) {
    io.on("connection", function (socket) {
        //查询域名
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
                                    stime: null,//docker启动开始时间
                                    etime: null,//docker启动完成时间
                                    port: null,//docker对外端口
                                    ip: null,//docker的外网ip
                                    dockerinfo: null,//docker本身
                                    conn: {}
                                };
                                task[rawUrl].conn[socket.id] = socket;


                                //判断存在泛解析不
                                dns.lookup([randomChar(), rawUrl].join("."), 4, function (err) {
                                    if (err) {
                                        //分片方式、少量域名可以，比较快
                                        //dnsLook(dicGroup, rawUrl, 0);

                                        //递归方式、多少没都问题就是慢点
                                        // nextDns(rawUrl, 0)

                                        //docker方案、单循环异步，简直就是暴力！
                                        //启动docker
                                        dockerapis({
                                            type: "create",
                                            servicename: enUrl(rawUrl),
                                            data: iniPost_data(enUrl(rawUrl))
                                        }, function () {
                                            sendMessage(rawUrl, "DOMAIN_STARTED1", []);
                                            task[rawUrl].stime = +new Date();
                                            var tomonitor = true;
                                            var timer = setInterval(function () {
                                                //监视docker
                                                if (tomonitor) {
                                                    dockerapis({
                                                        type: "monitor",
                                                        servicename: enUrl(rawUrl)
                                                    }, function (res) {
                                                        var tmp = toJson(res);
                                                        //docker已经启动
                                                        if (tomonitor && tmp.current_status == "Running") {
                                                            tomonitor = false;
                                                            task[rawUrl].etime = +new Date();
                                                            task[rawUrl].dockerinfo = toJson(res);
                                                            task[rawUrl].dockerinfo.instance_ports.forEach(function (item) {
                                                                if (item.container_port == config.socketport) {
                                                                    task[rawUrl].port = item.service_port;
                                                                    task[rawUrl].ip = item.ipaddress;
                                                                }
                                                            });

                                                            //io.connect(task[rawUrl].ip, task[rawUrl].port);
                                                            //
                                                            //开发中
                                                            //
                                                            //
                                                            sendMessage(rawUrl, "DOMAIN_STARTED2", []);
                                                            clearInterval(timer);
                                                        }
                                                    })
                                                }
                                            }, 100)
                                        })


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

        //响应断开连接
        socket.on("disconnect", function () {
            Object.keys(task).forEach(function (url) {
                if (task[url].conn[socket.id])
                    delete task[url].conn[socket.id];
            })
        })
    });
};

//docker监视、获取最新扫描结果
setInterval(function () {

}, 500);

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
        return /^([a-z0-9]+([a-z0-9]*|-+[a-z0-9]+)\.)+[a-z]{2,32}$/.test(url)
    })
}


//返回定长随机字符串
function randomChar(num) {
    var chars = "abcdefghijklmnopqrstuvwxyz";
    var result = [];
    num = num || 8;
    while (result.length < num) {
        var tmp = chars[Math.round(Math.random() * (chars.length - 1))];
        result.push(Math.random() > 0.5 ? tmp : tmp.toUpperCase());
    }
    return result.join("");
}

function nextDns(rawUrl, i) {
    dns.lookup([dic[i], rawUrl].join("."), 4, function (err, doc) {
        if (doc && !/202\.106\.199/.test(doc)) {
            console.log(i, dic[i], doc);
            var data = {ip: doc, url: dic[i], domain: rawUrl};
            task[rawUrl].domain.push(data);
            sendMessage(rawUrl, "DOMAIN_DATA", [data]);
        }
        //   console.log(i,rawUrl);
        sendMessage(rawUrl, "DOMAIN_PROGRESS", {
            domain: rawUrl,
            pos: i / dic.length
        });
        if (i + 1 < dic.length)
            nextDns(rawUrl, i + 1);
        else
        //保存记录
            db.urldb.findOneAndUpdate({domain: rawUrl}, {
                subdomain: task[rawUrl].domain,
                updated_at: Date.now()
            }, {upsert: true}, function () {
                delete task[rawUrl];
            })
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


//向订阅者群播
function sendMessage(url, title, body) {
    Object.keys(task[url].conn).forEach(function (id) {
        task[url].conn[id].emit(title, body)
    })
}


function iniPost_data(domain, group) {
    group = group || "normal";
    var envs = {
        "PORT": config.socketport,
        "MONGOURL": config.mongourl,
        "PASSPORT": randomChar(16),
        "DOMAIN": deUrl(domain)
    };
    return {
        "namespace": "csrf",
        "instance_envvars": envs,
        "service_name": domain,
        "region_name": "BEIJING1",
        "scaling_mode": "MANUAL",
        "target_num_instances": 1,
        "linked_to_apps": {},
        "instance_ports": [{
            endpoint_type: "tcp-endpoint",
            container_port: config.socketport,
            protocol: "tcp"
        }],
        "volumes": [],
        "target_state": "STARTED",
        "image_name": group_image(group).image_name,
        "instance_size": group_image(group).instance_size,
        "image_tag": group_image(group).image_tag,
        "run_command": group_image(group).run_command
    }
}

function group_image(name) {
    var images = {
        normal: {
            image_name: "index.alauda.cn/csrf/nginx",
            image_tag: "latest",
            run_command: "",
            instance_size: "XXS"
        },
        vip: {
            image_name: "index.alauda.cn/csrf/scanner",
            image_tag: "latest",
            run_command: "",
            instance_size: "S"
        }
    };
    return images[name];
}

function toJson(str) {
    try {
        str = JSON.parse(decodeURIComponent(str));
        return str;
    }
    catch (e) {
        return null
    }
}

function enUrl(rawUrl) {
    return rawUrl.replace(/\./g, "--")
}
function deUrl(rawUrl) {
    return rawUrl.replace(/--/g, ".")
}
var config = require("./config");

module.exports = dockerapis;

function dockerapis(options, callback) {
    var namespace = options.namespace || "csrf";
    var urls = {
        //创建docker
        create: {
            path: "/v1/services/" + namespace,
            method: "POST",
            data: JSON.stringify(options.data) || ""
        },//监视docker
        monitor: {
            path: "/v1/services/" + namespace + "/" + options.servicename,
            method: "GET",
            data: ""
        },//暂停docker
        stop: {
            path: "/v1/services/" + namespace + "/" + options.servicename + "/stop",
            method: "PUT",
            data: ""
        },//删除docker
        remove: {
            path: "/v1/services/" + namespace + "/" + options.servicename,
            method: "DELETE",
            data: ""
        },//创建任务
        task: {
            path: "/v1/jobs",
            method: "POST",
            data: JSON.stringify(options.data) || ""
        },//任务更新
        taskupdate: {
            path: "/v1/jobs/" + options.jobid,
            method: "PUT",
            data: JSON.stringify(options.data) || ""
        },//任务记录
        taskruninfo: {
            path: "/v1/jobs/" + options.jobid + "/execs/",
            method: "GET",
            data: ""
        },//用户的任务
        mytask: {
            path: "/v1/jobs?namespace=" + namespace + "&filter__name__startswith=" + options.taskname,
            method: "GET",
            data: ""
        },//任务某条记录日志
        tasklog: {
            path: "/v1/jobs/" + options.jobid + "/execs/" + options.exeid + "/logs?start_time=" + parseInt(new Date(options.started_at) / 1000 - 60 * 10),
            method: "GET",
            data: ""
        },//删除任务
        deltask: {
            path: "/v1/jobs/" + options.jobjd,
            method: "DELETE",
            data: ""
        }
    };
    var base = {
        hostname: config.docker.url,
        port: config.docker.port,
        path: urls[options.type].path,
        method: urls[options.type].method,
        headers: {
            "Authorization": "Token " + config.docker.token,
            "Content-Type": "application/json",
            "Content-Length": urls[options.type].data.length
        }
    };
    var tmp = "";
    var req = require(config.docker.pro).request(base, function (res) {
        res.on('data', function (res) {
            tmp += res;
        }).on('error', function (err) {
            console.log("token -get error", err)
        }).on('end', function () {
            callback(tmp)
        })
    });
    if (["POST", "PUT"].indexOf(urls[options.type].method) > -1 && urls[options.type].data) {
        req.write(urls[options.type].data);
    }
    req.end();
}
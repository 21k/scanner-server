module.exports = {
    socketport: process.env.SOCKETPORT || 3011,
    webport: process.env.WEBPORT || 3010,
    mongourl: process.env.MONGOURL || "mongodb://localhost/url_db",
    docker: {
        url: "api.alauda.cn",
        port: "443",
        pro: "https",
        token: process.env.DOCKERTOKEN || "xxÔÆµÄtoken£¬ÐÖµÜ"
    }
}
var db = {}
    , config = require("./config")
    , mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var dataDb = mongoose.createConnection(config.mongourl);
var dataSchema = new Schema({
    domain: String,
    ip: String,
    subdomain: Array,
    updated_at: Date
},{collection:"url_db"});

module.exports = {
    urldb: dataDb.model('url_db', dataSchema)
}


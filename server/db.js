var db = {}
    , mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId
    , url = process.env.MONGOURL||"mongodb://localhost/uibe_qutke";

var dataDb = mongoose.createConnection(url);
var dataSchema = new Schema({
    domain: String,
    ip: String,
    subdomain: Array,
    updated_at: {type: Date, default: Date.now}
},{collection:"url_db"});

module.exports = {
    urldb: dataDb.model('url_db', dataSchema)
}


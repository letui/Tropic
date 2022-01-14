importPackage(org.apache.commons.dbutils, org.apache.commons.dbutils.handlers, java.sql, java.util, java.time.format)
var index = {
    service: function(req, resp) {
        try {
            resp.body.append("Hello!! Welcome to Tropic engine.");
            resp.msg.append("Version:1.0");
        } catch (e) {
            println(e);
        }
        return resp;
    }
}
importPackage(org.apache.commons.dbutils, org.apache.commons.dbutils.handlers, java.sql, java.util, java.time.format)
var dbutils = {
    service: function (req, resp) {
        try {
            if (req.body) {
                var connection = $.jdbc();
                var run = $.sql();
                var sql = "select ".concat(req.body.select).concat(" from ").concat(req.body.table).concat(" where ").concat(req.body.filter);

                if(req.body.order){
                    sql=sql.concat(" order by ").concat(req.body.order);
                }
                if(req.body.limit){
                    sql=sql.concat(" limit ").concat(req.body.limit);
                }
                var result = run.query(connection, sql, $.asMapList);
                resp.body = $.format(result);
                resp.msg = "OK";
                resp.code = 200;
                $.jdbc(connection);
            }else{
                resp.code=500;
                resp.msg="request body is not provided";
            }
            return resp;
        } catch (e) {
            println(e);
            resp.msg=e;
            return resp;
        }
    }
};
if(engine.get("$")){
    $.gencrud=function(tables,asCamel) {
        function toCamel(name){
            var nName="";
            var arr=name.split("_");
            for(var j in arr){
                var n=arr[j];
                if(j==0){
                    nName=nName.concat(n.charAt(0).toLowerCase()).concat(n.substring(1,n.length));
                }else{
                    nName=nName.concat(n.charAt(0).toUpperCase()).concat(n.substring(1,n.length));
                }
            }
            return nName;
        }
        var jdbc = $.jdbc();
        var endpoints=[];
        for (var i in tables) {
            var sql = "select * from " + tables[i] + " limit 0,1";
            $.sql().query(jdbc, sql, function (rs) {
                var meta=rs.getMetaData();
                var model={table:tables[i],column:""};
                var j=1;
                var columns=[];
                var paramsHolder=[];
                var updatePaires=[];
                var saveParams=[];
                var selectColumns=[];
                for(;j<=meta.getColumnCount();j++){
                    if(meta.getColumnName(j)=="id")continue;
                    columns.push(meta.getColumnName(j));
                    selectColumns.push(asCamel?meta.getColumnName(j)+" as "+toCamel(meta.getColumnName(j)):meta.getColumnName(j));
                    paramsHolder.push("?");
                    saveParams.push(asCamel?"data."+toCamel(meta.getColumnName(j)):"data."+meta.getColumnName(j));
                    updatePaires.push(meta.getColumnName(j)+"=?");
                }
                model.column=columns.toString();
                model.selectColumns=selectColumns.toString();
                model.paramsHolder=paramsHolder.toString();
                model.updatePaires=updatePaires.toString();
                model.saveParams=saveParams.toString();

                let templ_save=`var ${model.table}_save = {
                service:function(req,resp){
                    var sql = "insert into ${model.table} (${model.column}) values (${model.paramsHolder}) ";
                    var data = req.body;
                    var jdbc = $.jdbc();
                    var rst=0;
                    try {
                        rst = $.sql().execute(jdbc, sql, ${model.saveParams});
                    } catch (e) {
                        resp.body.append(e);
                    }
                    if (rst > 0) {
                        resp.msg.append("OK");
                    } else {
                        resp.msg.append("Error");
                        resp.code = 500;
                    }
                    $.jdbc(jdbc);
                    return resp;
                }
            };`;


                let templ_select=`var ${model.table}_select = {
                service:function(req,resp){
                    var sql = "select ${model.selectColumns},id from ${model.table} limit 0,20";
                    var data = req.body;
                    var jdbc = $.jdbc();
                    var result = [];
                    try {
                        result = $.sql().query(jdbc, sql, $.asMapList);
                        result = $.format(result);
                        resp.body=result;
                    } catch (e) {
                        resp.msg.append("Error");
                        resp.code = 500;
                        resp.body.append(e);
                    }
                    $.jdbc(jdbc);
                    return resp;
                }
            };`;

                let templ_delete=`var ${model.table}_delete = {
                service:function(req,resp){
                    var sql = "delete from ${model.table} where id = ?";
                    var data = req.body;
                    var jdbc = $.jdbc();
                    var rst=0;
                    try {
                        rst = $.sql().execute(jdbc, sql, data.id);
                        resp.msg.append("OK");
                    } catch (e) {
                        resp.body.append(e);
                    }
                    $.jdbc(jdbc);
                    return resp;
                }
            };`;

                let templ_update=`var ${model.table}_update = {
                service:function(req,resp){
                    var sql ="update ${model.table} set ${model.updatePaires} where id = ?";
                    var data = req.body;
                    var jdbc = $.jdbc();
                    var rst=0;
                    try {
                        rst = $.sql().execute(jdbc, sql, ${model.saveParams},data.id);
                        resp.msg.append("OK");
                    } catch (e) {
                        resp.body.append(e);
                    }
                    $.jdbc(jdbc);
                    return resp;
                }
            };`;
                var localPath = Paths.get("./servlet/" + model.table);
                if (!Files.exists(localPath)){
                    Files.createDirectory(localPath);
                }
                Files.write(Paths.get("./servlet/"+model.table+"/save.js"),templ_save.getBytes());
                Files.write(Paths.get("./servlet/"+model.table+"/select.js"),templ_select.getBytes());
                Files.write(Paths.get("./servlet/"+model.table+"/update.js"),templ_update.getBytes());
                Files.write(Paths.get("./servlet/"+model.table+"/delete.js"),templ_delete.getBytes());
                endpoints.push(`{name:"${model.table}_save",servlet:"./servlet/${model.table}/save.js",path:"/${model.table}/save"}`);
                endpoints.push(`{name:"${model.table}_select",servlet:"./servlet/${model.table}/select.js",path:"/${model.table}/select"}`);
                endpoints.push(`{name:"${model.table}_update",servlet:"./servlet/${model.table}/update.js",path:"/${model.table}/update"}`);
                endpoints.push(`{name:"${model.table}_delete",servlet:"./servlet/${model.table}/delete.js",path:"/${model.table}/delete"}`);
            });
        }
        Files.write(Paths.get("./endpoins.js"),`var endpoints=[${endpoints}];`.getBytes());
    }
}
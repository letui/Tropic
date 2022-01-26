$.servlet("keytool", function (req, resp) {
    var array = req.body.form;
    var cmdObj = {};
    for (var item in array) {
        cmdObj[array[item].name] = array[item].value;
    }
    var rst = $.genkey(cmdObj);
    resp.body = rst;
    return resp;
});
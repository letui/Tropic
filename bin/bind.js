var bind = {
    service: function (req, resp) {
        if (config.server.auth_bind_token) {
            var token = req.headers.get("js$auth_bind_token");
            if (!token) {
                resp.code = 403;
                resp.msg.append("auth_bind_token is not provided in header");
                return resp;
            } else if (token && token.length == 1) {
                if (token[0] != config.server.auth_bind_token) {
                    resp.code = 403;
                    resp.msg.append("auth_bind_token is invalid");
                    return resp;
                }
            }
        }
        if (req.method == "PUT") {
            if (req.body.path && req.body.servlet && req.body.name) {
                server.bind(req.body);
                resp.msg.append("bind for path: " + req.body.path);
            }
        } else if (req.method == "DELETE") {
            if (req.body.path) {
                server.unbind(req.body);
            }
            resp.msg.append("unbind for path: " + req.body.path);
        } else if (req.method == "PATCH") {
            var path = req.headers.get("js$path");
            var servlet = req.headers.get("js$servlet");
            var name = req.headers.get("js$name");
            if (path && servlet && name) {
                var file = pathToFile("./patch/" + servlet[0]);
                var os = outStream(file);
                var bf = new StringBuffer();
                bf.append(req.body);
                os.write(bf.toString().getBytes());
                os.close();
                server.bind({path: path[0], servlet: "./patch/"+servlet[0], name: name[0]});
            }
            resp.msg.append("patch for path: " + path);
        } else {
            resp.code = 401;
            resp.msg.append("sorry,your action is not supported.");
        }
        return resp;
    }
};
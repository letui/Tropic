importPackage(com.sun.net.httpserver, java.nio.charset, java.net, java.lang, java.io, java.sql,
    java.util, java.time.format,java.time, java.util.concurrent, org.apache.commons.dbutils, org.apache.commons.dbutils.handlers);

function connectDB() {
    DriverManager.getDriver(config.db.url);
    var connection = DriverManager.getConnection(config.db.url, config.db.user, config.db.pass);
    return connection;
}
var $ = {
    setInterval:function(fn,time){
        var th = new Thread(function () {
            while (true) {
                fn();
                Thread.sleep(time);
            }
        });
        th.start();
        return th;
    },
    setTimeout:function(fn,time){
        var th = new Thread(function () {
            Thread.sleep(time);
            fn();
        });
        th.start();
        return th;
    },
    logger:function(name){
        var factory=Java.type("org.slf4j.LoggerFactory");
        name=name?name:"default";
        return factory.getLogger(name);
    },
    redis: function (back) {
        if (!$.redis.prototype.pool) {
            var ConfigRedis = Java.type("redis.clients.jedis.JedisPoolConfig");
            var configRedis = new ConfigRedis();
            configRedis.setMaxIdle(config.redis.maxIdle);
            configRedis.setMaxTotal(config.redis.maxTotal);
            var Pool = Java.type("redis.clients.jedis.JedisPool");
            $.redis.prototype.pool = new Pool(configRedis, config.redis.host, config.redis.port, config.redis.maxTimeout);
        }
        if (back) {
            $.redis.prototype.pool.returnResource(back);
        } else {
            return $.redis.prototype.pool.getResource();
        }
    },
    jdbc: function (back) {
        if(!$.jdbc.prototype.pool){
            $.jdbc.prototype.pool=new ArrayBlockingQueue(config.db.poolSize);
        }
        if (!back) {
            try {
                if ($.jdbc.prototype.pool.size() == 0) {
                    for (var i = 0; i < config.db.poolSize; i++) {
                        $.jdbc.prototype.pool.add(connectDB());
                    }
                }
                var conn = $.jdbc.prototype.pool.take();
                if (!conn.isClosed()) {
                    return conn;
                } else {
                    conn = connectDB();
                    return conn;
                }
            } catch (e) {
                println(e);
                throw  e;
            }
        } else if (back instanceof Connection) {
            if ($.jdbc.prototype.pool.size() < config.db.poolSize) {
                $.jdbc.prototype.pool.add(back);
            } else {
                if (!back.isClosed()) {
                    back.close();
                    back = null;
                }
            }
        }
    },
    sql: function () {
        return new QueryRunner();
    },
    asMapList: new MapListHandler(),
    get: function (url, headers, asJson) {
        var reqURL = new URL(url);
        var conn = reqURL.openConnection();
        conn.setConnectTimeout(config.http.connect_timeout);
        conn.setReadTimeout(config.http.read_timeout);
        for (var i in headers | {}) {
            conn.setRequestProperty(i, headers[i]);
        }
        var istr = conn.getInputStream();
        var bfr = new BufferedReader(new InputStreamReader(istr, "UTF-8"));
        var line = "";
        strbuf = new StringBuffer();
        while ((line = bfr.readLine()) != null) {
            strbuf.append(line);
        }
        bfr.close();
        if (asJson) {
            return eval("(" + strbuf.toString() + ")");
        } else {
            return strbuf.toString();
        }
    },
    post: function (url, headers, data, asJson) {
        var url = new URL(url);
        var conn = url.openConnection();
        conn.setDoOutput(true);
        conn.setConnectTimeout(config.http.connect_timeout);
        conn.setReadTimeout(config.http.read_timeout);
        for (var i in headers | {}) {
            conn.setRequestProperty(i, headers[i]);
        }
        var bfw = new BufferedWriter(new OutputStreamWriter(conn.getOutputStream(), "UTF-8"));
        bfw.write(JSON.stringify(data));
        bfw.flush();

        var bfr = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
        var line = "";
        var strbuf = new StringBuffer();
        while ((line = bfr.readLine()) != null) {
            strbuf.append(line);
        }
        bfr.close();
        if (asJson) {
            return eval("(" + strbuf.toString() + ")");
        } else {
            return strbuf.toString();
        }
    },
    format: function (maplist) {
        var list = [];
        for (var item in maplist) {
            var row = {};
            for (var key in maplist.get(item)) {
                var val = maplist.get(item).get(key);
                if (val != null && typeof val == "function") {
                    if (val instanceof LocalDateTime) {
                        row[key] = val.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } else if (val instanceof LocalDate) {
                        row[key] = val.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    }
                } else {
                    row[key] = val;
                }
            }
            list.push(row);
        }
        return list;
    },
    toJson: function (obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            println(e);
            throw e;
        }
    },
    fromJson: function (str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            println(e);
            throw e;
        }
    }
};

var server = {
    initRequest: function (ex) {
        var bfr = new BufferedReader(new InputStreamReader(ex.getRequestBody()));
        var line = "";
        var reqBody = "";
        while ((line = bfr.readLine()) != null) {
            reqBody = reqBody.concat(line);
        }
        return {
            headers: ex.getRequestHeaders(),
            method: ex.getRequestMethod(),
            uri: ex.getRequestURI(),
            body: reqBody.length == 0 ? null : ex.getRequestMethod() == "PATCH" ? reqBody : JSON.parse(reqBody),
            params: ex.getRequestURI().getQuery() != null ? {
                src: ex.getRequestURI().getQuery().split("&"),
                get: function (key) {
                    var rtn = [];
                    for (var i in this.src) {
                        if (this.src[i].startsWith(key + "=")) {
                            rtn.push(this.src[i].substr(this.src[i].indexOf("=") + 1))
                        }
                    }
                    if (rtn.length == 0) return null;
                    return rtn.length > 1 ? rtn : rtn[0];
                }
            } : null
        };
    },
    initResponse: function (ex) {
        return {
            headers: ex.getResponseHeaders(),
            body: new StringBuffer(),
            code: 200,
            msg: new StringBuffer()
        };
    },
    $: null,
    routerMap: {},
    bind: function (entry) {
        this.routerMap[entry.path] = {servlet: entry.servlet, name: entry.name};
        this.$.createContext(entry.path, this.accept);
    },
    unbind: function (entry) {
        if (this.routerMap[entry.path]) {
            this.routerMap[entry.path] = null;
            this.$.removeContext(entry.path);
        }
    },
    accept: function (ex) {
        try {
            var req = server.initRequest(ex);
            var resp = server.initResponse(ex);
            var entry = server.routerMap[ex.getRequestURI().getPath()];

            resp.headers.set("Content-Type", "application/json;charset=utf-8");
            var respJsonObj = {code: 404, msg: "NOT_FOUND"};
            if (entry != null) {
                load(entry.servlet);
                var servlet = engine.get(entry.name);
                var after = servlet.service(req, resp);
                if(!after){
                    after.code=707;
                    after.msg="not got any return from servlet";
                }
                respJsonObj = {
                    code: after.code,
                    msg: after.msg.toString(),
                    body: after.body instanceof StringBuffer ? after.body.toString() : after.body
                }
            }
            var respBodyStr = new StringBuffer();
            respBodyStr.append(JSON.stringify(respJsonObj));
            ex.sendResponseHeaders(200, respBodyStr.toString().getBytes(StandardCharsets.UTF_8).length);
            ex.getResponseBody().write(respBodyStr.toString().getBytes(StandardCharsets.UTF_8));
            ex.getResponseBody().close();
        } catch (e) {
            //println(e.toString());
            var error = new StringBuffer().append(JSON.stringify({
                code: 500,
                msg: "error",
                body: e.toString()
            }));
            ex.sendResponseHeaders(200, error.toString().getBytes(StandardCharsets.UTF_8).length);
            ex.getResponseBody().write(error.toString().getBytes(StandardCharsets.UTF_8));
            ex.getResponseBody().close();
        }
    },
    start: function (config) {
        var server = HttpServer.create(new InetSocketAddress(config.server.port), -1);
        $.logger().info("Server for listen on port:"+config.server.port);
        var endpoints = config.endpoints;
        var self = this;
        if (config.server.use_dynamic_bind) {
            endpoints.push({path: "/@bind", servlet: "./bin/bind.js", name: "bind"});
        }
        for (var i in endpoints) {
            this.routerMap[endpoints[i].path] = {servlet: endpoints[i].servlet, name: endpoints[i].name};
            server.createContext(endpoints[i].path, self.accept);
            $.logger().info("Init servlet for path:"+endpoints[i].path);
        }
        server.setExecutor(Executors.newFixedThreadPool(config.server.threads));
        server.start();
        this.$ = server;
        $.logger().info("Tropic is started.");
    },
    stop:function(){
        this.$.stop(1);
    }
};

importPackage(com.sun.net.httpserver, java.nio.charset, java.net, java.lang, java.io, java.sql,
    java.util, java.time.format, java.time, java.util.concurrent, org.apache.commons.dbutils, org.apache.commons.dbutils.handlers);
importPackage(com.mongodb);
importPackage(java.nio.file);

var $ = {
    neo4j: function (session) {
        if (!$.neo4j.prototype.driver) {
            var driver = org.neo4j.driver.GraphDatabase.driver(config.neo4j.uri, org.neo4j.driver.AuthTokens.basic(config.neo4j.user, config.neo4j.password));
            $.neo4j.prototype.driver = driver;
        }
        return session ? $.neo4j.prototype.driver.session() : $.neo4j.prototype.driver;
    },
    asDoc: function (obj) {
        return org.bson.Document.parse($.toJson(obj));
    },
    mongo: function (db, collection) {
        if (!$.mongo.prototype.client) {
            var Clients = Java.type("com.mongodb.client.MongoClients");
            var client = Clients.create(config.mongo.uri);
            $.mongo.prototype.client = client;
        }
        var client = $.mongo.prototype.client;
        try {
            if (db && !collection) {
                return client.getDatabase(db);
            } else if (db && collection) {
                return client.getDatabase(db).getCollection(collection);
            }
            return null;
        } catch (e) {
            $.logger("mongo").warn("error with mongo client");
        }
    },
    setInterval: function (fn, time) {
        var th = new Thread(function () {
            while (true) {
                fn();
                Thread.sleep(time);
            }
        });
        th.start();
        return th;
    },
    setTimeout: function (fn, time) {
        var th = new Thread(function () {
            Thread.sleep(time);
            fn();
        });
        th.start();
        return th;
    },
    logger: function (name) {
        var factory = Java.type("org.slf4j.LoggerFactory");
        name = name ? name : "default";
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
    db:function() {
        DriverManager.getDriver(config.db.url);
        return DriverManager.getConnection(config.db.url, config.db.user, config.db.pass);
    },
    jdbc: function (back) {
        if (!$.jdbc.prototype.pool) {
            $.jdbc.prototype.pool = new ArrayBlockingQueue(config.db.poolSize);
        }
        if (!back) {
            try {
                if ($.jdbc.prototype.pool.size() == 0) {
                    for (var i = 0; i < config.db.poolSize; i++) {
                        $.jdbc.prototype.pool.add($.db());
                    }
                }
                var conn = $.jdbc.prototype.pool.take();
                if (!conn.isClosed()) {
                    return conn;
                } else {
                    return $.db();
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
    },
    redirect: function (resp, url) {
        resp.to = url;
        return resp;
    },
    filter: function (name, fn) {
        engine.put(name, {service: fn});
    },
    servlet: function (name, fn) {
        engine.put(name, {service: fn});
    },
    boot: function () {
        function Server() {
            this.initRequest = function (ex) {
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
            };
            this.initResponse = function (ex) {
                return {
                    headers: ex.getResponseHeaders(),
                    body: new StringBuffer(),
                    code: 200,
                    msg: new StringBuffer()
                };
            };
            this.routerMap = {};
            this.filterMap = {};
            this.bind = function (entry) {
                this.routerMap[entry.path] = {servlet: entry.servlet, name: entry.name};
                this.prototype.createContext(entry.path, this.accept);
            };
            this.unbind = function (entry) {
                if (this.routerMap[entry.path]) {
                    this.routerMap[entry.path] = null;
                    this.prototype.removeContext(entry.path);
                }
            };
            this.accept = function (ex) {
                var reqPath = ex.getRequestURI().getPath();
                if (config.server.static_resource && reqPath.contains(".")) {
                    var suffix = reqPath.substring(reqPath.indexOf("."), reqPath.length);
                    if (config.server.static_resource.indexOf(suffix) > -1) {
                        load("./bin/static.js");
                        static_servlet.service(ex, reqPath);
                        return;
                    }
                }

                try {
                    var req = server.initRequest(ex);
                    var resp = server.initResponse(ex);

                    //filter process
                    for (var j in server.filterMap) {
                        if (ex.getRequestURI().getPath().startsWith(j)) {
                            load(server.filterMap[j].servlet);
                            var filter = engine.get(server.filterMap[j].name);
                            var after = filter.service(req, resp) || resp;
                            if (after.to) {
                                ex.getResponseHeaders().set("Location", after.to);
                                ex.sendResponseHeaders(302, -1);
                                return;
                            }
                        }
                    }

                    var entry = server.routerMap[ex.getRequestURI().getPath()];

                    resp.headers.set("Content-Type", "application/json;charset=utf-8");
                    var respJsonObj = {code: 404, msg: "NOT_FOUND"};
                    if (entry != null) {
                        load(entry.servlet);
                        var servlet = engine.get(entry.name);
                        var after = servlet.service(req, resp) || resp;

                        if (after.to) {
                            ex.getResponseHeaders().set("Location", after.to);
                            ex.sendResponseHeaders(302, -1);
                            return;
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
            };
            this.start = function (config) {
                var jserver = HttpServer.create(new InetSocketAddress(config.server.port), -1);
                $.logger().info("Server for listen on port:" + config.server.port);
                var endpoints = config.endpoints;
                if (config.server.use_dynamic_bind) {
                    endpoints.push({path: "/@bind", servlet: "./bin/bind.js", name: "bind"});
                }

                var filters = config.filters || [];
                for (var j in filters) {
                    this.filterMap[filters[j].path] = {servlet: filters[j].servlet, name: filters[j].name};
                }

                for (var i in endpoints) {
                    this.routerMap[endpoints[i].path] = {servlet: endpoints[i].servlet, name: endpoints[i].name};
                    jserver.createContext(endpoints[i].path, this.accept);
                    $.logger().info("Init servlet for path:" + endpoints[i].path);
                }
                jserver.setExecutor(Executors.newFixedThreadPool(config.server.threads));
                jserver.start();
                this.prototype = jserver;
                $.logger().info("Tropic is started.");
            };
            this.stop = function () {
                this.prototype.stop(1);
            };
        }

        var server = new Server();
        engine.put("server",server);
        server.start(config);
        var pid=java.lang.management.ManagementFactory.getRuntimeMXBean().getName();
        pid = pid.substring(0, pid.indexOf("@"));
        $.logger().info("App-pid:"+pid);
        var out=outStream(pathToFile("./app.pid"));
        out.write(pid.getBytes());
        streamClose(out);
        Runtime.getRuntime().addShutdownHook(new Thread(function () {
            server.stop(1);
            $.logger().info("Server is stopped");
        }));
        while (true) {
            var cmd = read(null, false);
            $.logger().info("--User Command--");
            $.logger().info(cmd);
            try {
                eval(cmd);
            } catch (e) {
                $.logger().info(e);
            }
        }
    }
};

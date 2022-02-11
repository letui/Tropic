importPackage(com.sun.net.httpserver, java.nio.charset, java.net, java.lang, java.io, java.sql,
    java.util, java.time.format, java.time, java.util.concurrent);
importPackage(org.apache.commons.dbutils, org.apache.commons.dbutils.handlers);
importPackage(com.mongodb);
importPackage(java.nio.file);
importPackage(java.security);
importPackage(javax.net.ssl);


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
            var HostAndPort = Java.type("redis.clients.jedis.HostAndPort");
            var JedisCluster= Java.type("redis.clients.jedis.JedisCluster");
            var configRedis = new ConfigRedis();
            configRedis.setMaxIdle(config.redis.maxIdle);
            configRedis.setMaxTotal(config.redis.maxTotal);
            configRedis.setTestOnBorrow(true);
            configRedis.setTestOnReturn(true);

            if (config.redis.clusters) {
                var clusters=config.redis.clusters;
                var set=new HashSet();
                for(var i in clusters){
                    var node=new HostAndPort(clusters[i].host,clusters[i].port);
                    set.add(node);
                }
                $.redis.prototype.pool = new ArrayBlockingQueue(config.redis.maxTotal);
                for(var i=0;i<config.redis.maxTotal;i++){
                    if(config.redis.password){
                        var cnn=new JedisCluster(set,config.redis.maxTimeout,config.redis.maxTimeout,5,config.redis.password,configRedis);
                        $.redis.prototype.pool.add(cnn);
                    }else{
                        var cnn=new JedisCluster(set,config.redis.maxTimeout,config.redis.maxTimeout,5,configRedis);
                        $.redis.prototype.pool.add(cnn);
                    }
                }
            } else {
                var Pool = Java.type("redis.clients.jedis.JedisPool");
                if (config.redis.password) {
                    $.redis.prototype.pool = new Pool(configRedis, config.redis.host, config.redis.port, config.redis.maxTimeout, config.redis.password);
                } else {
                    $.redis.prototype.pool = new Pool(configRedis, config.redis.host, config.redis.port, config.redis.maxTimeout);
                }
            }
        }

        if (back) {
            if (config.redis.clusters) {
                $.redis.prototype.pool.add(back);
            }else{
                $.redis.prototype.pool.returnResource(back);
            }
        } else {
            if (config.redis.clusters) {
                return $.redis.prototype.pool.take();
            }else {
                return $.redis.prototype.pool.getResource();
            }
        }
    },
    db: function () {
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
    empty: function (str) {
        if (str) {
            return str.length == 0;
        }
    },
    at: function (item, obj) {
        var type = Object.prototype.toString.call(obj);
        if (type == "[object Array]" || type == "[object String]") {
            return obj.indexOf(item);
        } else if (type == "[object Object]") {
            return obj.hasOwnProperty(item);
        }
    },
    each: function (obj, fn) {
        var type = Object.prototype.toString.call(obj);
        if (type == "[object Object]" || type == "[object Array]") {
            for (var i in obj) {
                fn(i, obj[i]);
            }
        } else {
            fn(0, obj);
        }
    },
    genkey: function (cmdObj) {
        var localPath = Paths.get("./" + cmdObj.keystorename);
        if (Files.exists(localPath)) {
            return {ok: true, msg: "The keystore of named '" + cmdObj.keystorename + "' has already exist."};
        }
        var cmdTmpl = "keytool -genkeypair -alias %s -keypass %s -keyalg %s -keysize %s -validity %s -keystore  ./%s -storepass %s -dname \"CN=%s, OU=%s, O=%s, L=%s, ST=%s, C=%s\"";
        var realCMD = java.lang.String.format(cmdTmpl, cmdObj.alias, cmdObj.keypasswd, cmdObj.alg, cmdObj.keysize, cmdObj.expire, cmdObj.keystorename, cmdObj.keystorepass,
            cmdObj.cname, cmdObj.ouname, cmdObj.oname, cmdObj.lname, cmdObj.stname, cmdObj.cname);

        var process = null;
        var os = java.lang.System.getenv("OS");
        if (os.startsWith("Windows")) {
            process = java.lang.Runtime.getRuntime().exec(["cmd", "/c", realCMD]);
        } else {
            process = java.lang.Runtime.getRuntime().exec(["/bin/sh", "-c", realCMD]);
        }
        var inp = new DataInputStream(process.getInputStream());
        var line = null;
        while ((line = inp.readLine()) != null) {
            println(line);
            return {ok: false, msg: line};
        }
        process.waitFor();
        $exit = process.exitValue();
        return {ok: true, msg: "Your keystore is generated"};
    },
    filter: function (name, fn) {
        engine.put(name, {service: fn});
    },
    servlet: function (name, fn) {
        engine.put(name, {service: fn});
    },
    console: function () {
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
    },
    status: function () {
        if (engine.get("server")) {
            return server.status > 0 ? "RUNNING" : "SHUTDOWN";
        } else {
            return "NOT_BOOT";
        }
    },
    bind: function (entry) {
        server.bind(entry);
    },
    unbind: function (entry) {
        server.unbind(entry);
    },
    afterBoot: function (fn) {
        config.server.afterBoot = fn;
    },
    afterShutdown: function (fn) {
        config.server.afterShutdown = fn;
    },
    shutdown: function () {
        if (engine.get("server")) {
            if (server.status > 0) {
                server.stop(1);
                server.status = 0;
            }
        }
    },
    boot: function () {
        function Server() {
            this.status = 0;
            this.initRequest = function (ex) {
                var bfr = new BufferedReader(new InputStreamReader(ex.getRequestBody(), "UTF-8"));
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
                        if (!engine.get("static_servlet")) {
                            load("./bin/static.js");
                        }
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
                var jserver = null;
                if (config.server.https_enable) {
                    jserver = HttpsServer.create(new InetSocketAddress(config.server.port), -1);
                    var ks = KeyStore.getInstance("JKS");   //建立证书库
                    ks.load(new FileInputStream(config.server.key_store_path), config.server.key_store_pass.toCharArray());  //载入证书
                    var kmf = KeyManagerFactory.getInstance("SunX509");  //建立一个密钥管理工厂
                    kmf.init(ks, config.server.key_pass.toCharArray());  //初始工厂
                    var sslContext = SSLContext.getInstance("SSLv3");  //建立证书实体
                    sslContext.init(kmf.getKeyManagers(), null, null);   //初始化证书
                    var httpsConfigurator = new HttpsConfigurator(sslContext);
                    jserver.setHttpsConfigurator(httpsConfigurator);
                } else {
                    jserver = HttpServer.create(new InetSocketAddress(config.server.port), -1);
                }

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
                    var jcontext = jserver.createContext(endpoints[i].path, this.accept);
                    $.logger().info("Init servlet for path:" + endpoints[i].path);
                    if (config.server.basic_auth_enable) {
                        try {
                            var authHdl = new BasicAuthenticator(endpoints[i].path, function (usr, pass) {
                                return usr == config.server.basic_auth_user && pass == config.server.basic_auth_pass;
                            });
                            jcontext.setAuthenticator(authHdl);
                        } catch (e) {
                            println(e);
                        }
                    }
                }
                jserver.setExecutor(Executors.newFixedThreadPool(config.server.threads));
                jserver.start();
                this.prototype = jserver;
                $.logger().info("Tropic is started.");
                this.status = 1;
            };
            this.stop = function () {
                this.prototype.stop(1);
            };
        }

        var server = new Server();
        engine.put("server", server);
        server.start(config);
        if (config.server.afterBoot && Object.prototype.toString.call(config.server.afterBoot) == "[object Function]") {
            config.server.afterBoot();
        }
        var pid = java.lang.management.ManagementFactory.getRuntimeMXBean().getName();
        pid = pid.substring(0, pid.indexOf("@"));
        $.logger().info("App-pid:" + pid);
        var out = outStream(pathToFile("./app.pid"));
        out.write(pid.getBytes());
        streamClose(out);
        Runtime.getRuntime().addShutdownHook(new Thread(function () {
            server.stop(1);
            $.logger().info("Server is stopped");
            if (config.server.afterShutdown && Object.prototype.toString.call(config.server.afterShutdown) == "[object Function]") {
                config.server.afterShutdown();
            }
        }));
        if (config.console) {
            $.console();
        } else {
            while ($.status() == "RUNNING") {
                Thread.sleep(5000);
            }
        }
    }
};

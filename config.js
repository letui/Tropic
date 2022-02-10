var config =
    {
        db: {
            url: "jdbc:mysql://127.0.0.1:3306/test",
            user: "root",
            pass: "123qwe123",
            driver: "com.mysql.cj.jdbc.Drvier",
            poolSize: 10,
        },
        neo4j:{
            uri:"bolt://127.0.0.1:7687/neo4j",
            user:"neo4j",
            password:"123qwe123"
        },
        mongo:{
            uri:"mongodb://localhost:27017/?maxPoolSize=20&w=majority"
        },
        redis: {
            host: "192.168.10.173",
            port: 6379,
            password:"123qwe123",
            maxIdle: 10,
            maxTotal: 20,
            maxTimeout: 2000
        },
        http: {
            connect_timeout: 3000,
            read_timeout: 3000
        },
        server: {
            port: 9999,
            threads: 200,
            basic_auth_enable:false,
            basic_auth_user:"admin",
            basic_auth_pass:"admin",
            https_enable:false,
            key_store_path:"./tropic.keystore",
            key_store_pass:"tropic123456",
            key_pass:"tropic123456",
            use_dynamic_bind: true,
            auth_bind_token: "Tropic",
            static_resource: [".js", ".css", ".html", ".png",".ico"]
        },
        endpoints: [
            {path: "/", servlet: "./bin/index.js", name: "index"},
            {path: "/@db", servlet: "./bin/dbutils.js", name: "dbutils"}
        ],
        filters: [
         //{path: "/", servlet: "./filter/corefilter.js", name: "corefilter"}
        ]
    };
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
            use_dynamic_bind: true,
            auth_bind_token: "Tropic"
        },
        endpoints: [
            {path: "/", servlet: "./bin/index.js", name: "index"},
            {path: "/@db", servlet: "./bin/dbutils.js", name: "dbutils"}
        ]
    };
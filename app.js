load("nashorn:mozilla_compat.js");
load("./config.js");
load("./bin/server.js");
function main() {
    server.start(config);
    Runtime.getRuntime().addShutdownHook(new Thread(function () {
        server.stop(1);
        $.logger().info("Server is stopped");
    }));
    while (true) {
        var cmd = read(null, false);
        $.logger().info("--User Command--");
        $.logger().info(cmd);
        try{
            eval(cmd);
        }catch (e){
            $.logger().info(e);
        }
    }
}
main();

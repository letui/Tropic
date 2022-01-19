var static_servlet = {
    service: function (ex,reqPath) {
        var localPath=Paths.get("./static"+reqPath);
        if(Files.exists(localPath)){
            var resource=Files.readAllBytes(localPath);
            ex.sendResponseHeaders(200, resource.length);
            ex.getResponseBody().write(resource);
            ex.getResponseBody().close();
        }else{
            var resource=new StringBuffer();
            resource.append("<h1>404</h1>");
            ex.sendResponseHeaders(404, resource.toString().getBytes(StandardCharsets.UTF_8).length);
            ex.getResponseBody().write(resource.toString().getBytes(StandardCharsets.UTF_8));
            ex.getResponseBody().close();
        }
    }
}
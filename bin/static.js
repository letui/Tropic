var static_servlet = {
    service: function (ex,reqPath) {
        var resource=Files.readAllBytes(Paths.get("./static"+reqPath))
        ex.sendResponseHeaders(200, resource.length);
        ex.getResponseBody().write(resource);
        ex.getResponseBody().close();
    }
}
Overview
========

Jstropic是什么意思？准确的说应该拆开来这个单词，js代表的是javascript，tropic是回归线，热带的意思。
Jstropic是一套体积很小的框架，是面向数据库到浏览器的数据处理框架，秉持少就是多的思想来提供强大的能力。

特征
--------

- 体积小
- 简单易用
- 无需编译
- 支持热部署
- 依托Java强大的开源生态
- 稳定可靠的JVM提供保障
- 可自由扩展

安装使用
------------

环境准备

* JDK1.8+
* Tropic

下载地址:https://github.com/letui/Tropic/releases/download/Tropic-1.3/Tropic-1.3.zip

快速上手
------------

        var index = {
        service: function(req, resp) {
                try {
                    resp.body.append("Hello!! Welcome to Tropic engine.");
                    resp.msg.append("Version:1.0");
                } catch (e) {
                    println(e);
                }
                return resp;
            }
        }
        
这么一段代码，启动我们的Tropic后，访问 http://127.0.0.1:9999/ 。即可在浏览器里看到：

        {"code":200,"msg":"Version:1.0","body":"Hello!! Welcome to Tropic engine."}

Contribute
----------

- Issue Tracker: http://github.com/letui/Tropic/issues
- Source Code: http://github.com/letui/Tropic
- Home Page: http://tropic.readthedocs.io/


Support
-------

如果你有任何问题，请一定让我们知道.
邮件地址: letui@qq.com

License
-------

The project is licensed under the Apache License 2.0

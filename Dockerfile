FROM openjdk:11
MAINTAINER letui@qq.com
RUN mkdir /home/tropic
ADD ./tropic /home/tropic/
WORKDIR /home/tropic
RUN cd /home/tropic
CMD sh start.sh

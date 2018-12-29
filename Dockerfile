FROM ubuntu:18.04
RUN apt-get update && apt-get install tzdata
ENV TZ="Europe/London"
# Apply TimeZone
# Layer size: tiny: 1.339 MB
RUN echo "Setting time zone to '${TZ}'" \
  && echo "${TZ}" > /etc/timezone \
  && dpkg-reconfigure --frontend noninteractive tzdata
# Update
RUN apt-get install -y \
	ca-certificates \
	curl \
	git \
	nodejs \
	npm \
	python3-pip \
	software-properties-common \
	unzip \
	webpack \
	wget \
	x11vnc \
	xvfb 
# Install google-chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get -y update
RUN apt-get install -y google-chrome-stable

# Install Chromedriver
RUN wget -O /tmp/chromedriver.zip https://chromedriver.storage.googleapis.com/`curl -sS https://chromedriver.storage.googleapis.com/LATEST_RELEASE`/chromedriver_linux64.zip
RUN unzip /tmp/chromedriver.zip chromedriver -d /usr/local/bin/
RUN chmod 0755 /usr/local/bin/chromedriver

# Install selenium
RUN pip3 install selenium
#RUN pip3 install pyvirtualdisplay

# Copying project files
WORKDIR /app
COPY ./wabot_extension ./wabot_extension
COPY ./config.js ./wabot_extension/lib/
RUN cd wabot_extension && npm install --save && webpack

COPY ./main.py .
COPY ./entry_point.sh .
RUN chmod +x ./entry_point.sh
RUN mkdir ./profile

# ENV 
ENV DISPLAY=:20
EXPOSE 5920
ENV DBUS_SESSION_BUS_ADDRESS=/dev/null
ENTRYPOINT ["/app/entry_point.sh"]

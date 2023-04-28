
#!/bin/bash
sudo apt update
sudo apt install ffmpeg

#apache2
sudo apt install apache2
sudo apt-get install -y phpsysinfo
sudo apt-get install php7.3-curl


#simple rtsp-simple-server
sudo wget https://github.com/aler9/rtsp-simple-server/releases/download/v0.10.0/rtsp-simple-server_v0.10.0_linux_arm7.tar.gz

tar -xzvf rtsp-simple-server_v0.10.0_linux_arm7.tar.gz

sudo mv rtsp-simple-server /usr/local/bin/
sudo mv rtsp-simple-server.yml /usr/local/etc/
sudo chmod 777 /usr/local/bin/rtsp-simple-server
sudo chmod 777 /usr/local/etc/rtsp-simple-server.yml
sleep 10
#install XtamLite
cd /home/pi/Desktop
unzip /home/pi/Desktop/XtamLite.zip -d /home/pi/Desktop
cd

sudo cp /home/pi/Desktop/XtamLite/Daemon/*  /etc/systemd/system/
sudo chmod -R 777 /etc/systemd/system

sudo cp /home/pi/Desktop/XtamLite/systemd/*  /etc/systemd/
sudo chmod -R 777 /etc/systemd

sudo cp /home/pi/Desktop/XtamLite/usr-local-bin/* /usr/local/bin
sudo chmod -R 777 /usr/local/bin

sudo cp -r /home/pi/Desktop/XtamLite/XtamLite /home/pi
sudo chmod -R 777 /home/pi/XtamLite/

sudo cp -r /home/pi/Desktop/XtamLite/html  /var/www/
sudo chmod -R  777 /var/www/html/

#install Mariadb o mysql
sudo apt upgrade
sudo apt install mariadb-server
pip3 install mariadb

#install Services
sudo systemctl daemon-reload

sudo  systemctl start alert-monitor.service
sudo  systemctl enable alert-monitor.service

sudo systemctl start rtsp-simple-server
sudo systemctl enable rtsp-simple-server

sudo systemctl start NOC.service
sudo systemctl enable NOC.service

sudo systemctl start xtam-socket.service
sudo systemctl enable xtam-socket.service

sudo systemctl start watchdog-service.service
sudo systemctl enable watchdog-service.service

sudo systemctl start streaming-camara1.service
sudo systemctl enable  streaming-camara1.service

sudo systemctl start streaming-camara2.service
sudo systemctl enable  streaming-camara2.service

sudo systemctl start streaming-camara3.service
sudo systemctl enable  streaming-camara3.service

sudo systemctl start streaming-camara4.service
sudo systemctl enable  streaming-camara4.service 

sudo systemctl start recordings-camara1.service
sudo systemctl enable recordings-camara1.service

sudo systemctl start recordings-camara2.service
sudo systemctl enable recordings-camara2.service

sudo systemctl start recordings-camara3.service
sudo systemctl enable recordings-camara3.service

sudo systemctl start recordings-camara4.service
sudo systemctl enable recordings-camara4.service

sudo systemctl start insert-recordings-service.service
sudo systemctl enable insert-recordings-service.service

sudo systemctl start delete-recordings-service.service
sudo systemctl enable delete-recordings-service.service

sudo systemctl start restart-streaming-securos.service
sudo systemctl enable restart-streaming-securos.service

sudo chmod -R 777 /etc/systemd/system
sudo chmod -R 777 /usr/local/bin
sudo chmod -R 777 /home/pi/XtamLite/
sudo chmod -R 777 /var/www/html/


sudo mkdir /mnt/HDD
sudo mkdir /mnt/HDD/listfolder
sudo chmod -R 777 /mnt/HDD/listfolder
sudo mkdir /mnt/HDD/listfolder/camara1
sudo mkdir /mnt/HDD/listfolder/camara2
sudo mkdir /mnt/HDD/listfolder/camara3
sudo mkdir /mnt/HDD/listfolder/camara4

#install ftp service
sudo apt-get install vsftpd
sudo cp -r /home/pi/Desktop/XtamLite/ftp/vsftpd.conf  /etc/vsftpd.conf
sudo cp -r /home/pi/Desktop/XtamLite/apache2/alias.conf  /etc/apache2/mods-enabled/alias.conf

#server NTP 
sudo cp -r /home/pi/Desktop/XtamLite/systemd/timesyncd.conf
 
#argon fan hat
curl https://download.argon40.com/argon1.sh | bash

#RTC
sudo bash /home/pi/XtamLite/rtc






#!/bin/bash
sudo cp -r /home/pi/Desktop/XtamLite/XtamLite/Recordings/Delete-Recordings  /home/pi/XtamLite/Recordings/
sudo cp -r /home/pi/Desktop/XtamLite/XtamLite/Recordings/Insert-Recordings  /home/pi/XtamLite/Recordings/
sudo chmod -R 777 /home/pi/XtamLite/Recordings/

sudo cp -r /home/pi/Desktop/XtamLite/systemd/timesyncd.conf  /etc/systemd/timesyncd.conf
sudo cp -r /home/pi/Desktop/XtamLite/html/response/index.php  /var/www/html/response/
sudo cp -r /home/pi/Desktop/XtamLite/usr-local-bin/NOC.sh  /usr/local/bin/
sudo cp -r /home/pi/Desktop/XtamLite/usr-local-bin/alert-monitor.sh  /usr/local/bin/
sudo chmod -R 777 /usr/local/bin

sudo cp -r /home/pi/Desktop/XtamLite/html/Api/Monitor /var/www/html/Api/
sudo cp -r /home/pi/Desktop/XtamLite/html/Api/api.php /var/www/html/Api/
sudo chmod -R 777 /var/www/html

sudo cp -r /home/pi/Desktop/XtamLite/Daemon/alert-monitor.service /etc/systemd/system/
sudo chmod -R 777 /etc/systemd/system

sudo  systemctl daemon-reload
sudo  systemctl start alert-monitor.service
sudo  systemctl enable alert-monitor.service

sudo cp -r /home/pi/Desktop/XtamLite/XtamLite/maxValues.txt  /home/pi/XtamLite/
sudo cp -r /home/pi/Desktop/XtamLite/html/index.html  /var/www/html/
sudo cp -r /home/pi/Desktop/XtamLite/html/XtamLite-UI/Api /var/www/html/XtamLite-UI/
sudo cp -r /home/pi/Desktop/XtamLite/html/XtamLite-UI/js /var/www/html/XtamLite-UI/
sudo cp -r /home/pi/Desktop/XtamLite/html/XtamLite-UI/index.html /var/www/html/XtamLite-UI/
sudo chmod -R 777 /var/www/html/
sudo chmod -R 777 /home/pi/XtamLite/




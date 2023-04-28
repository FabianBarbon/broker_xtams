# XtamLiteRPI
Proyecto Xtam Lite RPI 
# Hardware
Rasberry pi 4 B
# SO
Rasbian 10

# Fija Ip raspberry pi
Ingresar a una terminal de comandos y digitar   : 

sudo nano  /etc/network/interfaces

oprima enter

Ingresar la siguiente configuración en caso de que no exista al final del archivo:

#Ejemplo configuración de Red Raspberrypi
auto eth0
allow-hotplug eth0
iface eth0 inet static
    address 192.168.1.42
    netmask 255.255.255.0
    gateway 192.168.1.1

auto eth0:0
allow-hotplug eth0:0
iface eth0:0 inet static
    address 192.168.1.43
    netmask 255.255.255.0


La primera interfaz eth0 siempre pertenece a la configuración de red del Robustel y la segunda interfaz eth0:0 pertenece a la red local de las cámaras.

al terminar oprima ctrl + X para salir  y aparecerá un mensaje de confirmación oprima Y para guardar y luego ENTER sin cambiar el nombre del archivo.

# Instalación servidor RTSP/RTMP
# 1.Descargar rstp-simple-server
abrir un terminal en la RPI y ejecutar el siguiente comando:

sudo wget https://github.com/aler9/rtsp-simple-server/releases/download/v0.10.0/rtsp-simple-server_v0.10.0_linux_arm7.tar.gz

Extraer los archivos comprimidos que estan en /home/pi/

# 2.Instalar servicios 
Mover los archivos descargados a las siguientes locaciones:

sudo mv rtsp-simple-server /usr/local/bin/

sudo mv rtsp-simple-server.yml /usr/local/etc/

sudo chmod 777 /usr/local/bin/rtsp-simple-server

sudo chmod 777 /usr/local/etc/rtsp-simple-server.yml

Despues de mover los archivos a las locaciones indicadas se procede a crear el servicio DAEMON ejecutamos el siguiente comando:

sudo nano /etc/systemd/system/rtsp-simple-server.service

Pegar el siguiente codigo:

[Unit]
After=network.target
[Service]
ExecStart=/usr/local/bin/rtsp-simple-server /usr/local/etc/rtsp-simple-server.yml
[Install]
WantedBy=multi-user.target

Luego salimos con ctrl + x y guardamos con "s" o "y" segun el idioma.

# 3.habilitar el servicios creados 
Ejecutar en orden uno por uno:

sudo systemctl daemon-reload

sudo systemctl start rtsp-simple-server

sudo systemctl enable rtsp-simple-server

sudo systemctl status rtsp-simple-server // Si con este comando el estado es active running todo quedo OK

# 4.Instalación ffmpeg
En la carpeta raiz de la RPI ejecutar :

sudo apt-get install libav-tools //en algunos sistemas no es necesario y muestra el mensaje de obsoleto

sudo apt install ffmpeg

Probar con un flujo de alguna camara que tenga conectada o algun video,si es exitosa la prueba el rtsp server y el ffmpeg estan listos para operar.

ejemplo camara conectada generando video en el servidor RTSP:

ffmpeg -re -i rtsp://admin:Verytel2020@192.168.0.19/1 -an -framerate 15 -vf scale=320:240 -f rtsp rtsp://localhost:8554/live/channel1

# 5.Instalación Servidor APACHE
Se requiere instalar el servidor apache para alojar la parte Web.

sudo apt update

sudo apt install apache2

sudo apt-get install -y phpsysinfo

# 6.Instalación MariaDb
Se requiere instalar Mariadb para guardar grabaciones en base de datos.

sudo apt update

sudo apt upgrade

sudo apt install mariadb-server

pip3 install mariadb

# Instalación XtamLite Web
API - Se encarga de refrescar el sistema NOC cada minuto

response - Programa Websocket para monitorear el estado de los flujos en streaming y grabaciones

XtamLiteUI - Intefaz de configuración XtamLite

NOC - Sistema de monitoreo NOC

1. PASO 1 Descargue la carpeta /XtamLite/html alojada en este repositorio y reeplace en /var/www/

 sudo cp -r {ubicacion directorio html}  /var/www/
 
2. PASO 2 VERIFIQUE SI LA PAGINA DE CONFIGURACIÓN FUNCIONA http://{ipRPI}/XtamLite-UI/

# Instalación de servicios

El modulo de streaming funciona bajo servicios Daemon los cuales se tienen que crear manualmente.

1.Descargue la carpeta XtamLiteRPI del repositorio 

2.Copie todos los archivos de la carpeta /XtamLite/Daemon  en /etc/systemd/system/ 

  Si se presentan problemas al copiar los archivos de forma manual ejecute para dar permisos full-control:
  
  sudo chmod 777 /etc/systemd/system

  comando para copiar los archivos anteriores sin otorgar permisos : 

  sudo cp /home/pi/Desktop/XtamLiteRPI/XtamLite/Daemon/*  /etc/systemd/system/

3.Copie los archivos de /XtamLiteRPI/XtamLite/usr-local-bin en /usr/local/bin

  comando para copiar los archivos :sudo cp /home/pi/Desktop/XtamLiteRPI/XtamLite/usr-local-bin/* /usr/local/bin

4.Copie la carpeta completa /XtamLiteRPI/XtamLite/XtamLite en /home/pi/

  sudo cp -r /home/pi/Desktop/XtamLiteRPI/XtamLite/XtamLite /home/pi


Ahora Activar cada uno de los servicios copiados en /etc/systemd/system/ , siga los siguientes pasos para activar cada uno:

Nombre de los servicios:
*NOC.service
*xtam-socket.service
*streaming-camara1.service
*streaming-camara2.service
*streaming-camara3.service
*streaming-camara4.service
*recordings-camara1.service
*recordings-camara2.service
*recordings-camara3.service
*recordings-camara4.service
*delete-recordings-service.service
*insert-recordings-service.service
*restart-streaming-securos.service
*watchdog-service.service


1.sudo systemctl daemon-reload

2.sudo systemctl start NombreDelServicio.service

3.sudo systemctl enable NombreDelServicio.service

4.sudo systemctl status NombreDelServicio.service

# Instalación de disco exsterno HDD

Para hacer el montaje del disco externo siga las instrucciones del siguiente link:

https://www.raspberrypi.org/documentation/configuration/external-storage.md
1.conecte el disco duro antes de iniciar la raspberry pi:
2.Ejecute el siguiente comando para identificar el disco y su respectivo formato (ntfs, exfat) 

  sudo lsblk -o UUID,NAME,FSTYPE,SIZE,MOUNTPOINT,LABEL,MODEL
3.Despues de identificar el formato del disco ejecute según corresponda:
  Para exfat :
  
  sudo apt update
  
  sudo apt install exfat-fuse
  
  Para ntfs :
  
  sudo apt update
  
  sudo apt install ntfs-3g
  
4.Luego buscar la ruta del disco :

  sudo blkid
  
  Ejemplo de ruta : /dev/sda1

5.crear el directorio para el disco en el sistema :

  sudo mkdir /mnt/HDD

6.Montar el disco según la ruta que se mostro en el paso 4. ejemplo : /dev/sda1
  
  sudo mount /dev/sda1 /mnt/HDD
  
7.Verificar que el disco este correctamente montado.

ls /mnt/HDD

# Configuración automatica de arranque para el disco externo

Fuente:
https://www.raspberrypi.org/documentation/configuration/external-storage.md

 1.Obtener el UUID del disco:
 
   sudo blkid
   
   ejemplo : UUID=F8BEE5EABEE5A17C
   
 2.Abrir el archivo fstab :
 
   sudo nano /etc/fstab
   
   Agregue la siguiente linea de codigo al final:
   
   UUID=F8BEE5EABEE5A17C /mnt/HDD fstype defaults,auto,users,rw,nofail 0 0
   
   Reemplace en el comando anterior fstype por el tipo de disco que aparece en el paso 2.
  
   UUID=F8BEE5EABEE5A17C /mnt/HDD ntfs defaults,auto,users,rw,nofail,umask=000 0 0
   
   Para discos de tipo NTFS o FAT agregar despues del nofail  ,umask=000
   
   UUID=F8BEE5EABEE5A17C /mnt/HDD ntfs defaults,auto,users,rw,nofail,umask=000 0 0
   
 3. Guarde el archivo fstab con ctl  + x 
# Configuración de Cámaras
Las camaras deben ser configuradas en la pagina http://{ipRPI}/XtamLite-UI/ 

Si tiene problemas al guardar la información en la pagina ejecute el siguiente comando para otorgar permisos de escritura al archivo de configuración:

sudo chmod 777 /var/www/html/XtamLite-UI/configuration.json

# Nota: al terminar cualquier configuración abrir un terminal y ejecute para reiniciar los servicios
sudo python3 /home/pi/XtamLite/Watchdog-Service/restart-all-services.py

# Test
Los servicios de streaming se pueden probar con un reproductor como VLC con la siguiente url

rtsp://{IPRPI}:8554/live/channel{#canal}

# Hacer Test de Estres a la raspberry pi

ejecutar los siguientes comandos:

sudo apt-get install stress

wget https://raw.githubusercontent.com/ssvb/cpuburn-arm/master/cpuburn-a53.S

gcc -o cpuburn-a53 cpuburn-a53.S

Al terminar de instalar ejecute el siguiente comando para enviar la CPU al 100%

while true; do vcgencmd measure_clock arm; vcgencmd measure_temp; sleep 10; done& stress -c 4 -t 900s

Para salir del test oprimir ctrl +c 

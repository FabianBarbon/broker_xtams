// Importacion de librerias
var mysql = require('mysql');
const util = require('util');
var moment = require('moment');
const fs = require('fs');

// create a connection variable with the required details (Telemetria)
var con = mysql.createConnection({
    host: "10.147.20.113",
    user: "xtam",
    password: 'Xtam2021*',
    database: 'xtamtelemetria'
});

//crear conexion mysql xtamDb Abajo o c4.
var con_xtamDB = mysql.createConnection({
    host: "10.147.20.205",   //Cambiar por la ip del C4
    user: "xtam",
    password: 'Xtam2021*',
    database: 'xtamdb'
});

/*  PROCESO PARA CALCULAR Y FORMATEAR LA FECHA DEL SERVIDOR  */
function date_server() {
    var hoy = new Date();
    var fecha2 = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear();
    fecha2 = fecha2.replaceAll("-", "/")
    var hora2 = hoy.getHours() + ':' + hoy.getMinutes() + ':' + hoy.getSeconds();
    var fecha_server = `${fecha2} ${hora2}`;
    return fecha_server;
}

/*  CONEXION SERVIDOR MOSQUITO  */
const mqtt = require('mqtt');
const { log } = require('console');
const host = '18.189.242.242'
const port = '1883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

//Conexion
const connectUrl = `mqtt://${host}:${port}`
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'test',
    password: 'test',
    reconnectPeriod: 1000,
})

//Suscribirse
const topic = 'XTAM/DATA'
client.on('connect', () => {
    console.log('Connected:  ' + client.connected)
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`)
    })
})


/*  CONEXION AL SERVIDOR DE MOSQUITO */
client.on('message', (topic, payload) => {
    var response = JSON.parse(payload.toString())
    console.log("respuestaaa: " + response.ID);
    console.log(["Xtam  notificacion service :: " + response.xtam]);
    // llamo a la logica de la base de datos
    operation_db( response.ID , response)  //response.ID    Testt
})

function operation_db(id_module,telemetry) {
    
    // Calcular llave foranea del xtam
    con.query(`call calculate_id ("${id_module}")`, (error, results, fields) => {
        console.log("Modulo: " + id_module);
        if (error) {
            return console.error(error.message);
            saveLog (`Error al momento de calcular operacion db ${id_module} , el error es: ${error.message}`)
        }
        let [RowDataPacket] = results[0]
        if (RowDataPacket === undefined) {
            console.log(" No existe el id module: ");
            saveLog (`Error , no existe el modulo: ${id_module} , el error es: ${error.message}`)
        } else
        {
            console.log("  step 1 ");
            let {
                id
            } = RowDataPacket
            console.log("fk xtam : " + id);
            ultimate_new (id,telemetry )
            ultimate_newCamera(id,telemetry);  //12   id
            ultimate_newRecordings (id,telemetry)
        }
        //con.end();
    });
}

function ultimate_new (fk_xtam,telemetry )
{
    console.log("ultimate_new : " + fk_xtam + "   " + telemetry.temp);
    // existe el xtam en la tabla novedades (xtam_news)
    con.query(` SELECT x.id,x.ipserver,x.id_modulo, DATE_FORMAT(date (xn.fecha), '%d/%m/%Y') as fecha ,
                    time(xn.fecha) as hora ,xn.Id_xtam_news  FROM xtamtelemetria.xtam_news  xn
                    INNER JOIN xtams x on x.id  = xn.Fk_xtam
                        where xn.Fk_xtam =  ${fk_xtam}   order by xn.fecha desc limit 1
                        `, (error, results, fields) => {
        if (error) {
            return console.error(error.message);
            //Guardar error en el log
            saveLog (`Error al momento de calcular la ultima novedad para el xtam ${fk_xtam} , el error es: ${error.message}`)
        }
        if (results.length == 0) {
            console.log("haga el insert");
            insert_xtam_news(fk_xtam, telemetry)
        } else {
            let {
                fecha,
                hora,
                Id_xtam_news
            } = results[0]

            fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
            fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');

            minutess = fecha_server.diff(fecha_format, 'minutes', true); //difrenecia en minutos
            //console.log("************************************minutos   han pasado::**************** " + minutess);
            const miutes_insert = 28; //30
            // validacion tiempo
            if (minutess >= miutes_insert) 
            {
                insert_xtam_news(fk_xtam, telemetry) // 12 fk_xtam
                //logica aqui
                rtsp    = telemetry.xtam.substring(8,9)
                ftp     = telemetry.xtam.substring(9,10)
                apache  = telemetry.xtam.substring(10)
                insert_service("rtsp",rtsp,fk_xtam)
                insert_service("ftp",ftp,fk_xtam)
                insert_service("apache",apache,fk_xtam)
            }else{
                console.log("El tiempo no le da para insertar un registro...: " + fk_xtam);
            }
        }
    });
}

function insert_service (service, valuee, id_xtam) 
{
    let categoryy ; 
    if ( service == "rtsp" ) {
        categoryy = 1;
    }else if(service == "ftp" ){
        categoryy = 2;
    }else if(service == "apache" ){
        categoryy = 3;
    }

    //Insertar servicios 
    con.query(`insert into xtam_news (Fk_xtam,Fk_categoria,valor ) values (${id_xtam},${categoryy},${valuee} ) `,
    (error, results, fields) =>
    {
        if (error) {
            return console.error(error.message);
            saveLog (`Insertar servicios fkxtam: ${idCam}, el error es: ${error.message}`)
        }
        else{
            console.log(`Se inserto las novedades en xtam news de la funcion servicios,${service}`); 
        }
    });
}

function ultimate_newCamera (fk_xtam,telemetry )
{
    console.log("ultimate_newCamera, id xtam: " +fk_xtam  );
    // existe el xtam en la tabla novedades (camara_news)
    con.query(`select cn.Id_camara_news, cn.valor,c.Nombre as categoria, 
    DATE_FORMAT(date (cn.fecha), '%d/%m/%Y') as fecha ,
    time(cn.fecha) as hora
    from cameras_news cn 
    inner join categorias c on cn.Fk_categoria = c.Id_categoria
    inner join cameras cam on cn.Fk_camera = cam.cameraid
    where cam.id_centrocomercial  =  ${fk_xtam}   order by cn.fecha desc limit 1`, (error, results, fields) =>
    {
    if (error) {
        return console.error(error.message);
        saveLog (`Error al momento de calcular la ultima novedad en camara news ${fk_xtam} , el error es: ${error.message}`)
    }
    if (results.length == 0) {
        console.log("haga el insert en cameranews");
        calculatecams_site (telemetry) 
    }else
    {
        let {
              fecha,
              hora,
              Id_camara_news
        } = results[0]

        fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
        fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');

        minutess = fecha_server.diff(fecha_format, 'minutes', true); //difrenecia en minutos
        //console.log("************************************minutos   han pasado::**************** " + minutess);
        const miutes_insert = 28;   //30 cambiar
        // validacion tiempo
          if (minutess >= miutes_insert)
          {
              //insertar cada 30 minutos segun su ultimo registro en la base de datos
              calculatecams_site (telemetry) 
          }else {
              console.log("El tiempo no le da para insertar un registro...: "  + fk_xtam);
          }
        }
    });
}


function ultimate_newRecordings (fk_xtam,telemetry )
{
    console.log("ultimate_newRecordings, id xtam: " +fk_xtam  );
    // existe el xtam en la tabla novedades (camara_news)
    con.query(`SELECT rn.Id_recording_news,
    rn.Fk_camera,
    rn.valor,
    c.Nombre,
    DATE_FORMAT(date (rn.fecha), '%d/%m/%Y') AS fecha,
    time(rn.fecha) AS hora
    FROM recordings_news rn
    INNER JOIN categorias c ON rn.Fk_categoria = c.Id_categoria
    INNER JOIN cameras cam ON rn.Fk_camera = cam.cameraid
    where cam.id_centrocomercial  =  ${fk_xtam}   order by rn.fecha desc limit 1`, (error, results, fields) =>
    {
    if (error) {
        return console.error(error.message);
        saveLog (`Error al momento de calcular la ultima novedad en recordings news ${fk_xtam} , el error es: ${error.message}`)
    }
    if (results.length == 0) {
        console.log("haga el insert en recordings news");
        calculatecams_rcordings (telemetry) 
    }else
    {
        let {
              fecha,
              hora
        } = results[0]

        fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
        fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');

        minutess = fecha_server.diff(fecha_format, 'minutes', true); //difrenecia en minutos
        //console.log("************************************minutos   han pasado::**************** " + minutess);
        const miutes_insert = 5;   //30 cambiar
        // validacion tiempo
          if (minutess >= miutes_insert)
          {
              //insertar cada 30 minutos segun su ultimo registro en la base de datos
              calculatecams_rcordings (telemetry) 
              console.log( "Esto es uno " + fecha + "  " + hora );
          }else {
              console.log("El tiempo no le da para insertar un registro...: "  + fk_xtam);
          }
        }
    });
}

function insert_xtam_news(fk_xtam,telemetry)
{
      var query = `INSERT INTO xtamtelemetria.xtam_news (Fk_xtam, Fk_categoria, valor) VALUES ?`;
      // data array
      var data = [
          [fk_xtam, 4, telemetry.temp],
          [fk_xtam, 5, telemetry.hum ],
          [fk_xtam, 6, telemetry.Wop ],
          [fk_xtam, 12, telemetry.Vop],
          [fk_xtam, 13, telemetry.Wbt],
          [fk_xtam, 14, telemetry.Vbt],
          [fk_xtam, 9, telemetry.bat],
          [fk_xtam, 15, telemetry.red],
          [fk_xtam, 10, telemetry.Rdb],
      ];
      //console.log("Data: " + data);
      con.query(query, [data], function(err, response)
      {
            if (err) {
                return console.log(err.message);
                saveLog (`Error al momento de insertar la novedad en xtam news ${data} , el error es: ${error.message}`)
            }
            else {
                console.log('Registros insertados: ' + response.affectedRows);
            }
      });
}

//devolver el fk de las camaras segun el sitio
function calculatecams_site ( trackXtam ) {
    console.log("Logica segunda database"  + Object.keys (trackXtam) );
    con_xtamDB.query(`call HowCameras_site("${trackXtam.ID}") `, (error, results, fields) => { //${trackXtam.ID}  Testt
    if (error) {
        return console.error(error.message);
        saveLog (`Error al momento de calcular el fk de la camara ${trackXtam} , el error es: ${error.message}`)
    } else {
        let [RowDataPacket] = results[0]
        //console.log( "Que ve " + RowDataPacket + " Keys  " +Object.keys(RowDataPacket) );
        //console.log( "Esto " + RowDataPacket.JsonCamerasId  );
        //console.log( typeof  RowDataPacket.JsonCamerasId );
        const obj = JSON.parse(RowDataPacket.JsonCamerasId);
        console.log("parseado " +typeof obj   + "Cuantos tiene  " + obj.length);

        insert_cameras_news (obj, trackXtam.xtam ) // 11xx1xxx111 -> pruebas  á cambiar trackXtam.xtam
    }
    });
}

function calculatecams_rcordings ( trackXtam ) {
    console.log("Logica segunda database"  + Object.keys (trackXtam) );
    con_xtamDB.query(`call HowCameras_site("${trackXtam.ID}") `, (error, results, fields) => { //${trackXtam.ID}  Testt
    if (error) {
        return console.error(error.message);
        saveLog (`Error al momento de calcular el fk de la camara ${trackXtam} , el error es: ${error.message}`)
    } else {
        let [RowDataPacket] = results[0]
        const obj = JSON.parse(RowDataPacket.JsonCamerasId);
        console.log("parseado " +typeof obj   + "Cuantos tiene  " + obj.length);

        insert_recordings_news (obj, trackXtam.xtam ) // 11xx1xxx111 -> pruebas  á cambiar trackXtam.xtam
    }
    });
}


//insertar en cameranews
function insert_cameras_news(objCameras, trackXtam) // 
{
    console.log("Entro a insertar novedad en camaras");
    //los 4 primeros representan los stream
    r = trackXtam.substring(0,4)
    foundStreams = []

    for (let index = 0; index < r.length; index++) {
        if (r[index] != "x" ) {
            foundStreams.push( parseInt (r[index]))
        }
    }

    if (objCameras.length  == foundStreams.length) {
        console.log("------------------------------------------------------------------------");
        console.log( "Coinciden la cantidad de camaras con las que reporta la telemetria" );
        let insrrrr =[]
        
        for (let index = 0; index < objCameras.length; index++) 
        {
            var cat_index = new Object();
            cat_index.Fk_categoria = 1 ;
            cat_index.cameraid = objCameras[index].cameraid;
            cat_index.valuue   = foundStreams[index]
        
            insrrrr.push(Object.values(cat_index))
        }
        //Fk_categoria  Fk_camera   valor
        update_cameras ( insrrrr );
        /*  insertar novedades en cameranews */
        var ins_camNews = `INSERT INTO xtamtelemetria.cameras_news (Fk_categoria, Fk_camera, valor) VALUES ?`;

        con.query(ins_camNews, [insrrrr], function(err, response)
        {
            if (err) {
                return console.log(err.message);
                saveLog (`Error al momento de insertar novedades en camara news : ${insrrrr}, el error es: ${error.message}`)
            }else {
                console.log('Registros insertados en camara news: ' + response.affectedRows);
            }
        });
    }
}

//insert recordings news

//insertar en cameranews
function insert_recordings_news(objCameras, trackXtam) // 
{
    console.log("Entro a insertar novedad en recordings");
    //los 4 primeros representan los stream
    r = trackXtam.substring(4,8)
    foundRecordings = []

    for (let index = 0; index < r.length; index++) {
        if (r[index] != "x" ) {
            foundRecordings.push( parseInt (r[index]))
        }
    }

    if (objCameras.length  == foundRecordings.length) {
        console.log("------------------------------------------------------------------------");
        console.log( "Coinciden la cantidad de camaras con las que reporta la telemetria" );
        let insRecordings =[]
        
        for (let index = 0; index < objCameras.length; index++) 
        {
            var cat_index = new Object();
            cat_index.Fk_categoria = 16 ;
            cat_index.cameraid = objCameras[index].cameraid;
            cat_index.valuue   = foundRecordings[index]
        
            insRecordings.push(Object.values(cat_index))
        }

        /*  insertar novedades en cameranews */
        var ins_camNews = `INSERT INTO xtamtelemetria.recordings_news (Fk_categoria, Fk_camera, valor) VALUES ?`;

        con.query(ins_camNews, [insRecordings], function(err, response)
        {
            if (err) {
                return console.log(err.message);
                saveLog (`Error al momento de insertar novedades en recordings news : ${insRecordings}, el error es: ${error.message}`)
            }else {
                console.log('Registros insertados en camara news: ' + response.affectedRows);
            }
        });
    }
}


function update_cameras (arr_cams)
{
    console.log("Que puede ver ,entro actualixzar" , + arr_cams.length + "Tipo  " + typeof arr_cams);
    console.log("***********************************************");
    for (let index = 0; index < arr_cams.length; index++) 
    {
        let isActive = arr_cams [index][2] == 1 ? "active" : "inactive";
        console.log("Que " + arr_cams[index][1]  + "   " + isActive );
        exec_uptCameras(arr_cams[index][1] , isActive)
    }
}

//select cameraid,direccion,id_centrocomercial,estado  from cameras where cameraid = 39

function exec_uptCameras (idCam, stateCam)
{
    con.query(`SELECT cameraid,direccion,id_centrocomercial,estado FROM cameras WHERE cameraid = ${idCam} `,
    (error, results, fields) =>
    {
        if (error) {
            return console.error(error.message);
            saveLog (`Ejecutar la actualizacion de camaras en la base de datos del c4 : ${idCam}, el error es: ${error.message}`)
        }
        if (results.length == 0) {
            console.log(`No hay datos del idcam:   ${idCam} `);
        }else
        {
            console.log( idCam +" "+results[0].cameraid+" "+ stateCam + " " +results[0].estado);
            if ( idCam == results[0].cameraid  && stateCam != results[0].estado ) 
            {
                console.log("Aplica para actualizacion: " );

                con.query(`UPDATE cameras
                SET estado = "${stateCam}"
                WHERE cameraid = ${idCam} `,
                (error, results, fields) =>{
                    if (error) {
                        return console.error("Error al momento de actualizar camaras news: " +error.message);
                    }else{
                        console.log("Actualizacion completada.");
                    }
                });
            }else {
                console.log("No aplica para actualizacion");
            } 
        }
    });
}


// guaradar en el log
function saveLog ( txtt )
{
    // Get the file contents before the append operation
    fs.readFileSync("logListen.txt", "utf8");
    fs.appendFile("logListen.txt",  `\n ${txtt}` , (err) => {
        if (err) {
          console.log(err);
        }
        else {
          // Get the file contents after the append operation
          console.log("\nFile Contents of file after append:",
            fs.readFileSync("logListen.txt", "utf8"));
        }
      });
}


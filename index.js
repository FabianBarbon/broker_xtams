//HAGASE EL METODO QUE ACTUALICE XTAM ABAJO, SAQUE ALS CONEXION EN VARIABLES DE ENTORNO
require("dotenv").config();
// constantes
const UNDEFINNED = undefined; 
const CEROO = 0; 
const NULLL = null;
const STOP = "STOP";
// Importacion de librerias
let mysql = require('mysql');
const util = require('util');
let moment = require('moment');
const fs = require('fs');
let parseInt = require('parse-int');
const miutes_insert =  process.env.INSERT_PRODUCCION  //que pasa en el caso de que no reporte           //howMinutes();

// create a connection variable with the required details (Telemetria),conexion telemetria
var con = mysql.createConnection({
    host: process.env.HOST_TELEMETRIA_PROD,       
    user: process.env.USER_TELEMETRIA_PROD,               
    password: process.env.PASS_TELEMETRIA_PROD,      
    database:  process.env.DB_TELEMETRIA_PROD  
});

// Evento para manejar la conexión exitosa
con.connect(function(err) {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database!');
});

// create conexion con la base de datos de abajo *(c4)
//crear conexion mysql xtamDb Abajo o c4.
var con_c4 = mysql.createConnection({
    host: process.env.HOST_C4,   //Cambiar por la ip del C4
    user: process.env.USER_C4,
    password: process.env.PASS_C4,
    database: process.env.DB_C4
});


/*  PROCESO PARA CALCULAR Y FORMATEAR LA FECHA DEL SERVIDOR  */
function date_server() {
    var hoy = new Date();
    var fecha2 = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear();date_server
    fecha2 = fecha2.replaceAll("-", "/")
    var hora2 = hoy.getHours() + ':' + hoy.getMinutes() + ':' + hoy.getSeconds();
    var fecha_server = `${fecha2} ${hora2}`;
    return fecha_server;
}

/*  PROCESO PARA CALCULAR Y FORMATEAR LA FECHA DEL SERVIDOR  */
function date_server_stamp() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var date_time = date + ' ' + time;
    return date_time;
}

//console.log("QUE FECHA VE AQUIII " , date_server_stamp());

/*  CONEXION SERVIDOR MOSQUITO  */
const mqtt = require('mqtt');
const { log, Console } = require('console');
const { loadavg } = require("os");
const host = '18.189.242.242'
const port = '1883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

//Conexion
const connectUrl = `mqtt://${host}:${port}`
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username:process.env.USER_MQTT, 
    password: process.env.PASS_MQTT,
    reconnectPeriod: 1000,
})

// Función para verificar si todos los valores son nulos en el objeto
function sonTodosValoresNulos(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] !== null) {
          return false; // Si encuentra un valor no nulo, retorna false
        }
      }
    }
    return true; // Si no encontró ningún valor no nulo, retorna true
}

//insertCamerasinoutRecordings
function insert_flinoutRecords(tablee,insertCameraNews) {
       //insertar novedades en camera news,
        con.query(`INSERT INTO ${tablee} (Fk_categoria, Fk_camera, valor,fecha,Fk_serial) VALUES ?`, [insertCameraNews], function(err, response)
        {
            if (err) {
                 saveLog (`Error al momento de insertar novedades en la tabla   : ${tablee}, el error es: ${err.message}, consulta:${ins_camNews} , info:: ${[insertCameraNews]}, fecha ${date_server()} `)
                 return console.log(err.message);
            }else {
                 console.log(`Registros insertados en la tabla ${tablee}:` + response.affectedRows);
            }
        });
}

//actualizar la de abajo cameras
function update_cameras ( flOutnValues,objCameras ) {
    for (let index = 0; index < objCameras.length; index++) {
        if ( flOutnValues[index] == "RUN" ){
            flOutnValues[index] = "on"
        }else if (flOutnValues[index] == "STOP") {
            flOutnValues[index] = "off"
        }
        //consulto bd del c4 
        con_c4.query(`SELECT cameraid,direccion,id_centrocomercial,estado FROM cameras WHERE cameraid = ${objCameras[index].cameraid} `,
        (error, results, fields) =>
        {
            if (error) {
                return console.error(error.message);
                saveLog (`error al consultar tabla camaras edel c4 : ${objCameras[index].cameraid}, el error es: ${error.message}, fecha: ${date_server()} `)
            }
            if (results.length == 0) {
                console.log(`No hay datos del idcam:   ${objCameras[index].cameraid} `);
            }else
            {
                console.log( `${objCameras[index].cameraid}` +" "+results[0].cameraid+" "+ `${flOutnValues[index] }` + " " +results[0].estado);
                if ( objCameras[index].cameraid == results[0].cameraid  && flOutnValues[index] != results[0].estado ) {
                    console.log("Aplica para actualizacion camaras del c4");
                    con_c4.query(`UPDATE cameras
                    SET estado = "${flOutnValues[index]}"
                    WHERE cameraid = ${objCameras[index].cameraid } `,
                    (error, results, fields) =>{
                        if (error) {
                            return console.error("Error al momento de actualizar cameras del c4: " +error.message);
                        }else{
                            console.log("Actualizacion completada de cameras en el c4.");
                        }
                    });
                }else {
                    console.log("No aplica para actualizacion de cameras del c4");
                }
            }
        });

    }
}

// funcion actualixar c.c en el c4
function update_cc (cc,state) {
    try {
        con_c4.query(`UPDATE centro_comercial
        SET estado = "${state}", update_at="${date_server_stamp()}"
        WHERE id = ${cc}`,
        (error, results, fields) =>{
            if (error) {
                return console.error("Error al momento de actualizar c.c  del c4: " +error.message);
            }else{
                console.log("Actualizacion completada de c.c  en el c4.");
            }
        });
    } catch (error) {
        saveLog (`error al actualizar c.c en el c4, el error es: ${error.message}, fecha: ${date_server()} `)
    }
}

//insertar en camara news de telemetria
function insert_cameras_news(objCameras, trackXtam,numeroCamaras) // 
{
    const { telemetria,XTAM,  }= trackXtam
    const {FlujosIn,FlujosOut,Recordings} = XTAM
 
    // Llamada a la función para verificar el objeto
    const todosSonNulos = sonTodosValoresNulos(FlujosIn);
    let insrCameraNews = []
    let insRecorsNews = []
    let insCamsPro = []
    let countterr =1;
    
    if (todosSonNulos == false) 
    {
       let flInValues = Object.values(FlujosIn)
       let flOutnValues = Object.values(FlujosOut)
       let recValues = Object.values(Recordings)
       //console.log("    si o no  ",  objetoEstaVacio(objCameras)); 
            for (let index = 0; index < objCameras.length; index++) 
            {
                //console.log("objcanmmeras:: " ,objCameras[index].cameraid);
                // flujo entrada
                let cam_obj = new Object();
                cam_obj.Fk_categoria = 33+index ;
                cam_obj.cameraid = objCameras[index].cameraid;
                cam_obj.valuue   = flInValues[index];
                cam_obj.datee_serv   = date_server_stamp();
                cam_obj.serial = trackXtam.ID
                // objeto recordings
                let rec_obj = new Object();
                rec_obj.Fk_categoria = 41+index;
                rec_obj.cameraid = objCameras[index].cameraid;
                rec_obj.valuue = recValues[index];
                rec_obj.datee_serv   = date_server_stamp();
                rec_obj.serial = trackXtam.ID
                // glujosalida
                let camPro_obj = new Object();
                camPro_obj.Fk_categoria = 37+index;
                camPro_obj.cameraid = objCameras[index].cameraid;
                camPro_obj.valuue = flOutnValues[index];
                camPro_obj.datee_serv   = date_server_stamp();
                camPro_obj.serial = trackXtam.ID
                //////////////////////////////////////////////////////////
                    insrCameraNews.push(Object.values(cam_obj));
                    insRecorsNews.push(Object.values(rec_obj));
                    insCamsPro.push(Object.values(camPro_obj))
         }
            //console.log("inssss :: ",insrCameraNews ," Cuantos", insrCameraNews.length);
            insert_flinoutRecords("cameras_news",insrCameraNews )
            insert_flinoutRecords("cameras_news",insRecorsNews)
            insert_flinoutRecords("cameras_news",insCamsPro)
            update_cameras ( flOutnValues,objCameras );
        
    }
  
}

//objeto vacio
function objetoEstaVacio(obj) {
    if ( obj != undefined) {
        return Object.entries(obj).length === 0;
    }
  }

// calculates sites
//devolver el fk de las camaras segun el sitio
function calculatecams_site ( trackXtam ) {
    console.log("Logica segunda database"  + Object.keys (trackXtam) );
    con_c4.query(`call HowCameras_site("${trackXtam.ID}") `, (error, results, fields) => { //${trackXtam.ID}  Testt
    if (error) {
        return console.error(error.message);
        saveLog (`Error al momento de calcular el fk de la camara ${trackXtam} , el error es: ${error.message},fecha: ${date_server()} `)
    } else {
        let [RowDataPacket] = results[0]
        const obj = JSON.parse(RowDataPacket.JsonCamerasId);
        //console.log("parseado " +typeof obj   + "Cuantos tiene  " + obj.length + `cameraid = ${obj.cameraid}`);
        if (obj!= undefined) {
            //objetoEstaVacio("objjjjjj que>",  obj)
            insert_cameras_news (obj, trackXtam,RowDataPacket.numeroCamaras ) // 11xx1xxx111 -> pruebas  á cambiar trackXtam.xtam
        }
        
    }
    });
}

// cameras news actualizaciones_??
function ultimate_newCamera(fk_xtam, telemetry) {
    console.log("ultimate_newCamera, id xtam: " + fk_xtam);
    con.query(`select cn.Id_camara_news, cn.valor, c.Nombre as categoria, 
    DATE_FORMAT(date(cn.fecha), '%d/%m/%Y') as fecha,
    time(cn.fecha) as hora
    from cameras_news cn 
    inner join categorias c on cn.Fk_categoria = c.Id_categoria
    inner join cameras cam on cn.Fk_camera = cam.cameraid
    where cam.id_centrocomercial = ${fk_xtam} order by cn.fecha desc limit 1`, (error, results, fields) => {
        if (error) {
            console.error(error.message);
            saveLog(`Error al momento de calcular la ultima novedad en camara news ${fk_xtam} , el error es: ${error.message},fecha: ${date_server()} `);
        } else if (results.length === 0) {
            console.log("haga el insert en cameranews");
            //console.log("telemetriaaaaaaa:  ",telemetry );
            calculatecams_site(telemetry);
        } else {
            let {
                fecha,
                hora,
                Id_camara_news,
                Id_xtam_news // Corrijo el nombre de la variable para que coincida con el resultado de la consulta
            } = results[0];
            const fecha_server = moment(); // Agrego una instancia de moment para obtener la fecha actual
            fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
            minutess = fecha_server.diff(fecha_format, 'minutes', true); // Diferencia en minutos
            
            // Validación del tiempo
            if (minutess >= miutes_insert) {
                // Insertar cada 30 minutos según su último registro en la base de datos
                calculatecams_site(telemetry); 
            } else {
                console.log("El tiempo no le da para insertar un registro a camara news...: " + fk_xtam);
            }
        }
    });
}


//Suscribirse
const topic = 'XTAM/DATA'
client.on('connect', () => {
    if (!client.connected) {
        console.log('MQTT client is not connected.');
        return;
    }
    console.log("Conecatdo al servidor de mosquito");
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`)
    })
})

let dataAlarms = [] 


//establecer inactivo en el c4 
function setCC_C4 () {
    try {
        con_c4.query(`SELECT id,descripcion,estado,id_modulo,update_at,
        DATE_FORMAT(date(update_at), '%d/%m/%Y') as fecha, time(update_at) as hora FROM  centro_comercial`,
        (error, results, fields) =>
        {           
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const fecha_server = moment(); // Agrego una instancia de moment para obtener la fecha actual
                fecha_format = moment(`${results[i].fecha} ${results[i].hora}`, 'DD/MM/YYYY HH:mm:ss');
                minutess_CC_C4 = fecha_server.diff(fecha_format, 'minutes', true); // Diferencia en minutos
                id_mod = results[i].id_modulo;
               
                if ( minutess_CC_C4>=95  && (id_mod!==null && id_mod.length >=4  ) ) {
                    update_cc (results[i].id,"off")
                }
            }
        });   
    } catch (err) {
        saveLog (`Error al momento establecer inactivo en el c4. `)
        return;
    }
}

// CONEXION AL SERVIDOR DE MOSQUITO 
client.on('message', (topic, payload) => {
    try {
        //console.log("Que veee ", JSON.parse(payload.toString()));
        setCC_C4 ();
        let response = JSON.parse(payload.toString())
        let {telemetria,XTAM,ID } = response
        // llamo a la logica de la base de datos
        operation_db( response.ID , response)  //response.ID    Testt
    } catch (error) {
        console.log(error);
    }
})

function operation_db(id_module,telemetry) {
   console.log("id_module ", id_module, "  telemetry ",telemetry, "ID ", telemetry.ID);
    
    try {
        //console.log("Operation db",`call calculate_id ("${id_module}")`);
        // Calcular llave foranea del xtam
        con.query(`call calculate_id ("${id_module}")`, (error, results, fields) => 
        {
            if (error) {
                saveLog (`Error al momento de calcular operacion db ${id_module} , el error es: ${error.message}, fecha: ${date_server()} `)
                return console.error(error.message); 
            }
            let [RowDataPacket] = results[0]
            if (RowDataPacket === undefined) {
                //no hagas nada aqui o se totea
                return
            } else
            {
                console.log("  step 1 ");
                let {id, descripcion} = RowDataPacket
                //console.log("fk xtam : " + id);
                ultimate_new (id,telemetry,descripcion )
                ultimate_newCamera(id,telemetry);
            }
            //con.end();
        });
    } catch (er) {
        console.log("exepcion producida en la funcion : operation_db " );
        saveLog (`Exepcion producida en la funcion : operation_db,fecha:  ${date_server()} `)
        
    }
}

function ultimate_new (fk_xtam,telemetry,descripcion )
{
    try 
    {
         // existe el xtam en la tabla novedades (xtam_news)
        con.query(`SELECT x.id,x.ipserver,x.id_modulo, DATE_FORMAT(date (xn.fecha), '%d/%m/%Y') as fecha ,
        time(xn.fecha) as hora ,xn.Id_xtam_news  FROM xtam_news  xn
        INNER JOIN xtams x on x.id  = xn.Fk_xtam
        where xn.Fk_xtam =  ${fk_xtam}   order by xn.fecha desc limit 1`, (error, results, fields) => 
        {
            if (error) {
                //return console.error(error.message);
                //Guardar error en el log
                saveLog (`Error al momento de calcular la ultima novedad para el xtam ${fk_xtam} , el error es: ${error.message},fecha: ${date_server()} `)
            }
            if (results.length == 0) {
                console.log("haga el insert");
                let {telemetria,XTAM,ID} = telemetry
                
                insert_xtam_news(fk_xtam,telemetria,XTAM,ID ) 
                insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion )
            } else {
                //ya existe el primer registo del equipo xtam en la base de datos
                let {fecha,hora,Id_xtam_news} = results[0]
                fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
                fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');
                minutess = fecha_server.diff(fecha_format, 'minutes', true); //difrenecia en minutos
                //console.log("************************************minutos   han pasado::**************** " + minutess);
                // validacion tiempo
                if (minutess >= miutes_insert) 
                {
                    //insertar informacion
                    let {telemetria,XTAM,ID} = telemetry
                    insert_xtam_news(fk_xtam,telemetria,XTAM,ID ) 
                    insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion )
                    exec_uptCameras(fk_xtam,XTAM,telemetria,descripcion,ID)
                }else{
                    console.log("El tiempo no le da para insertar un registro...: " + fk_xtam);
                }
            }
        });    
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : ultimate_new, fecha:${date_server()}`);
    }
}

//insertar novedad en xtam
function insert_xtam_news(fk_xtam,telemetria,XTAM,ID)
{   
    try 
    {   
        var criticidad = CriticalLevel (telemetria,XTAM);
        console.log("criticidad  " + criticidad );    
        var  data = []; 
        /*console.log( "  temp ", telemetria.tem, "   hum ", telemetria.hum,  "   Wop5V", telemetria.Wop5V,"  Vop12V ",telemetria.Vop12V
        ,"   Wop12V ", telemetria.Wop12V, " bat ", telemetria.bat, "  red ", telemetria.red, " Rdb ",  telemetria.Rdb);*/
        var fechaServidorr = date_server_stamp();
        // validaciones vienen vacios>
        if ( telemetria.temp != UNDEFINNED) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 4,criticidad, telemetria.temp.toFixed(2),fechaServidorr,ID])
        } 
    
        if ( telemetria.hum > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 5, criticidad, telemetria.hum.toFixed(2),fechaServidorr,ID])
        } 
        if ( telemetria.Vop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 12,criticidad, telemetria.Vop5V.toFixed(2),fechaServidorr,ID])
        } 
        if ( telemetria.Wop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 6,criticidad, telemetria.Wop5V.toFixed(2),fechaServidorr,ID])
        } 
        if ( telemetria.Vop12V > CEROO) 
        {
            data.push([fk_xtam, 17,criticidad, telemetria.Vop12V.toFixed(2),fechaServidorr,ID])
        } 
        if ( telemetria.Wop12V > CEROO) 
        {
            data.push( [fk_xtam, 18,criticidad, telemetria.Wop12V.toFixed(2),fechaServidorr,ID] )
        } 
        if ( telemetria.bat > CEROO) 
        {
            data.push([fk_xtam, 9,criticidad,  telemetria.bat,fechaServidorr,ID])
        }
        if ( telemetria.red > CEROO) 
        {
            data.push([fk_xtam, 15,criticidad, telemetria.red,fechaServidorr,ID])
        } 
        if ( telemetria.Rdb > CEROO) 
        {
            data.push([fk_xtam, 10,criticidad, telemetria.Rdb,fechaServidorr,ID])
        }
  
        if ( XTAM.GPU > CEROO) 
        {
            data.push([fk_xtam, 25,criticidad, XTAM.GPU,fechaServidorr,ID])
        } 
        
        if ( XTAM.CPU > CEROO) 
        {
            data.push([fk_xtam, 24,criticidad, XTAM.CPU,fechaServidorr,ID])
        } 
        if ( XTAM.RAM > CEROO) 
        {
            data.push([fk_xtam, 26,criticidad, XTAM.RAM,fechaServidorr,ID])
        }
        if ( XTAM.TempCPU > CEROO) 
        {
            data.push([fk_xtam, 27,criticidad, XTAM.TempCPU,fechaServidorr,ID])   ///.toFixed(2)
        }
        if ( XTAM.TempGPU > CEROO) 
        {
            data.push([fk_xtam, 28,criticidad, XTAM.TempGPU,fechaServidorr,ID]) //
        }
        
        if ( XTAM.DiskUse > CEROO) 
        {
            data.push([fk_xtam, 29,criticidad, XTAM.DiskUse,fechaServidorr,ID])
        }
        if ( XTAM.DiskUse2 > CEROO) 
        {
            data.push([fk_xtam, 30,criticidad, XTAM.DiskUse2,fechaServidorr,ID])
        }

        //Insertar en la base de datos>
        var query = `INSERT INTO xtam_news (Fk_xtam, Fk_categoria, criticidad, valor,fecha,Fk_serial) VALUES ?`; //xtamtelemetria.
        
        console.log('Antes de ejecutar el query');
        con.query(query, [data], function(err, response){
            if (err) {
                saveLog (`Error al momento de insertar la novedad en xtam news, el error encontrado es: ${err.message}, fecha:${date_server()} , la consulta es: ${query} ,data  ${data}, fecha: ${date_server()} `)
                return console.log(err.message);
            }
            else {
                console.log('Registros insertados: ' + response.affectedRows );
            }
        });
    } catch (error) {
        saveLog (`Excepcion producida en la funcion : xtam_news, fecha:${date_server()}`);
    }
}

//insertar novedad en xtam services news
function insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion)
{
    //console.log("Descripcion  ", descripcion);
   if ( (XTAM.FlujosOut.OUTSTC1===NULLL || XTAM.FlujosOut.OUTSTC1=== UNDEFINNED) && 
        (XTAM.FlujosOut.OUTSTC2===NULLL || XTAM.FlujosOut.OUTSTC2=== UNDEFINNED) &&
        (XTAM.FlujosOut.OUTSTC3===NULLL || XTAM.FlujosOut.OUTSTC3=== UNDEFINNED) &&
        (XTAM.FlujosOut.OUTSTC4===NULLL || XTAM.FlujosOut.OUTSTC4=== UNDEFINNED) &&

        (XTAM.FlujosIn.INSTC1===NULLL || XTAM.FlujosIn.INSTC1=== UNDEFINNED) &&
        (XTAM.FlujosIn.INSTC2===NULLL || XTAM.FlujosIn.INSTC2=== UNDEFINNED) &&
        (XTAM.FlujosIn.INSTC3===NULLL || XTAM.FlujosIn.INSTC3=== UNDEFINNED) &&
        (XTAM.FlujosIn.INSTC4===NULLL || XTAM.FlujosIn.INSTC4=== UNDEFINNED) &&

        (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED ) &&
        (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED ) &&
        (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED ) &&
        (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED )
    ){
        //insertar en la tabla alarmas, este evento sucede cuando no reporta xtam los servicios que tiene a disposicion
        console.log("Que ve  ",  fk_xtam,descripcion, "Servicios caidos",);
        update_cc (fk_xtam,"off")
        selectAlarms(fk_xtam,descripcion,"Servicios caidos", null,ID) 
   }else
   {
        //validar por servicios xtam
        if  (XTAM.FlujosOut.OUTSTC1===NULLL || XTAM.FlujosOut.OUTSTC1=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#1", null,ID)
        }
        if  (XTAM.FlujosOut.OUTSTC2===NULLL || XTAM.FlujosOut.OUTSTC2=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#2", null,ID)
        }
        if  (XTAM.FlujosOut.OUTSTC3===NULLL || XTAM.FlujosOut.OUTSTC3=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#3", null,ID)
        }
        if  (XTAM.FlujosOut.OUTSTC4===NULLL || XTAM.FlujosOut.OUTSTC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#4", null,ID)
        }
        if  (XTAM.FlujosIn.INSTC1===NULLL || XTAM.FlujosIn.INSTC1=== UNDEFINNED) {
            //alarma salida 1 null
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#1", null,ID)
        }
        if  (XTAM.FlujosIn.INSTC2===NULLL || XTAM.FlujosIn.INSTC2=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#2", null,ID)
        }
        if  (XTAM.FlujosIn.INSTC3===NULLL || XTAM.FlujosIn.INSTC3=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion, "Flujo Entrada#3", null,ID)  //tipo:35
        }
        if  (XTAM.FlujosIn.INSTC4===NULLL || XTAM.FlujosIn.INSTC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#4", null,ID)
        }
        if  (XTAM.Recordings.RDC1===NULLL || XTAM.Recordings.RDC1=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#1", null,ID)
        }
        if  (XTAM.Recordings.RDC2===NULLL || XTAM.Recordings.RDC2=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#2", null,ID)
        }
        if  (XTAM.Recordings.RDC3===NULLL || XTAM.Recordings.RDC3=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#3", null,ID)
        }
        if  (XTAM.Recordings.RDC4===NULLL || XTAM.Recordings.RDC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#4", null,ID)
        }

        if  (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"Ftp", null,ID)
        }
        if  (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"APACHE", null,ID)
        }
        if  (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED ){
            selectAlarms(fk_xtam,descripcion,"Ping C4", null,ID)
        }
        if  (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"Ping Robustel", null,ID)
        }
        let data = [];
        let fechaServidorr = date_server_stamp();
        if (XTAM.Services.RTSPserver != NULLL )  {
            data.push( [fk_xtam, 1, XTAM.Services.RTSPserver,fechaServidorr,ID] )
        }
        if (XTAM.Services.FTP != NULLL )  {
            data.push( [fk_xtam, 2, XTAM.Services.FTP,fechaServidorr,ID] )
        }
        if (XTAM.Services.APACHE != NULLL )  {
            data.push( [fk_xtam, 3, XTAM.Services.APACHE,fechaServidorr,ID] )
        }
        if (XTAM.Services.PingC4 != NULLL )  {
            data.push( [fk_xtam, 31, XTAM.Services.PingC4,fechaServidorr,ID] )
        }
        if (XTAM.Services.PingRobustel != NULLL )  {
            data.push( [fk_xtam, 32, XTAM.Services.PingRobustel,fechaServidorr,ID] )
        }
        if (XTAM.FlujosIn.INSTC1 != NULLL )  {
            data.push( [fk_xtam, 33, XTAM.FlujosIn.INSTC1,fechaServidorr,ID] )
        }
        if (XTAM.FlujosIn.INSTC2 != NULLL )  {
            data.push( [fk_xtam, 34, XTAM.FlujosIn.INSTC2,fechaServidorr,ID] )
        }
        if (XTAM.FlujosIn.INSTC3 != NULLL )  {
            data.push( [fk_xtam, 35, XTAM.FlujosIn.INSTC3,fechaServidorr,ID] )
        }
        if (XTAM.FlujosIn.INSTC4 != NULLL )  {
            data.push( [fk_xtam, 36, XTAM.FlujosIn.INSTC4,fechaServidorr,ID] )
        }
        if (XTAM.FlujosOut.OUTSTC1 != NULLL )  {
            data.push( [fk_xtam, 37, XTAM.FlujosOut.OUTSTC1,fechaServidorr,ID] )
        }
        if (XTAM.FlujosOut.OUTSTC2 != NULLL )  {
            data.push( [fk_xtam, 38, XTAM.FlujosOut.OUTSTC2,fechaServidorr,ID] )
        }
        if (XTAM.FlujosOut.OUTSTC3 != NULLL )  {
            data.push( [fk_xtam, 39, XTAM.FlujosOut.OUTSTC3,fechaServidorr,ID] )
        }
        if (XTAM.FlujosOut.OUTSTC4 != NULLL )  {
            data.push( [fk_xtam, 40, XTAM.FlujosOut.OUTSTC4,fechaServidorr,ID] )
        }
        if (XTAM.Recordings.RDC1 != NULLL )  {
            data.push( [fk_xtam, 41, XTAM.Recordings.RDC1,fechaServidorr,ID ] )
        }
        if (XTAM.Recordings.RDC2 != NULLL )  {
            data.push( [fk_xtam, 42, XTAM.Recordings.RDC2,fechaServidorr,ID ] )
        }
        if (XTAM.Recordings.RDC3 != NULLL )  {
            data.push( [fk_xtam, 43, XTAM.Recordings.RDC3,fechaServidorr,ID ] )
        }
        if (XTAM.Recordings.RDC4 != NULLL )  {
            data.push( [fk_xtam, 44, XTAM.Recordings.RDC4,fechaServidorr,ID ] )
        }
        //xtam_services_news cambiar el valor de xtam service news a varchar 40
        if (XTAM.LastBoot != NULLL )  {
            XTAM.LastBoot = XTAM.LastBoot.slice(0,10) + " " + XTAM.LastBoot.slice(10)
            data.push( [fk_xtam, 49, XTAM.LastBoot,fechaServidorr,ID ] )
        }
        //insertar 
        con.query(`INSERT INTO xtam_services_news (Fk_xtam, Fk_categoria, valor,fecha,Fk_serial) VALUES ?`, [data], function(err, response)
        {
            if (err) {
                saveLog (`Error al momento de insertar la novedad en xtam services news ${data} , el error es: ${err.message}, fecha: ${date_server()} `)
            }
            else {
                console.log('Registros insertados en xtam_services_news: ' + response.affectedRows);
            }
        });
   }
}

// guaradar en el log
function saveLog ( txtt )
{
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

function howMinutes () {
    //tenga en cuenta la ruta del archivo del cual se extraen los minutos
    let archivo = fs.readFileSync('C:/Users/Administrator/Documents/minutes.txt', 'utf-8');
    let whatMinutes = JSON.parse(archivo);
    let minutuess = parseInt(whatMinutes.Minutes) ;
    return  minutuess;
}


// borrar telemetria status y en c.c del dev 
//Actualizar base de datos C4
function exec_uptCameras (id_cc, XTAM,telemetria,descripcion,serial)
{   
    //console.log("----------------------------------------------------");
    //console.log(   "XTAM  " ,XTAM);
    //console.log(   "telemetria  " ,telemetria);
    //console.log("----------------------------------------------------");
    update_cc (id_cc,"on")
    let { FlujosIn,FlujosOut,Recordings,Services } = XTAM
    const newKeysFlujosIn  = {INSTC1: 'Flujo Entrada#1', INSTC2: 'Flujo Entrada#2',INSTC3: 'Flujo Entrada#3', INSTC4: 'Flujo Entrada#4'};
    const newKeysFlujosOut = {OUTSTC1: 'Flujo Salida#1', OUTSTC2: 'Flujo Salida#2',OUTSTC3: 'Flujo Salida#3', OUTSTC4: 'Flujo Salida#4'};
    const newKeysRecordings = {RDC1: 'Recording#1', RDC2: 'Recording#2',RDC3: 'Recording#3', RDC4: 'Recording#4'};
    const newKeysServices = {FTP: 'FTP', APACHE: 'APACHE',PingC4: 'Ping C4', PingRobustel: 'Ping Robustel'};
     
    let C = renameKeys(FlujosIn, newKeysFlujosIn);
    let D = renameKeys(FlujosOut, newKeysFlujosOut);
    let E = renameKeys(Recordings, newKeysRecordings);
    let  F = renameKeys(Services, newKeysServices);

    addDataAlarms(C,id_cc,descripcion,serial)
    addDataAlarms(D,id_cc,descripcion,serial)
    addDataAlarms(E,id_cc,descripcion,serial)
    addDataAlarms(F,id_cc,descripcion,serial)

   if ( telemetria.temp >= process.env.UMBRAL_TEM_BTA_MAX) {
        dataAlarms.push([id_cc,descripcion,"Temperatura Xtam", telemetria.temp,serial]  )
   }
   if ( telemetria.hum >= process.env.UMBRAL_HUM_BTA_MAX) {
    dataAlarms.push([id_cc,descripcion,"Humedad", telemetria.hum,serial]  )
   } 
   if ( telemetria.Vop5V >= process.env.UMBRAL_VOP5V_BTA_MAX) {
    dataAlarms.push([id_cc,descripcion,"Potencia de operación 5v", telemetria.Wop5V,serial]  )
   } 
   if ( telemetria.bat <= process.env.UMBRAL_BAT_BTA_MIN  ) {
    dataAlarms.push([id_cc,descripcion,"% carga bateria", telemetria.bat,serial]  )
   } 
   if ( telemetria.red <=  2 ) {
    dataAlarms.push([id_cc,descripcion,"Tipo de red 2g,3g,4g", telemetria.red,serial]  )
   }

   
   if ( telemetria.Rdb <=  90 || telemetria.Rdb >= 110   ) {
    dataAlarms.push([id_cc,descripcion,"potencia de la señal", telemetria.red,serial]  )
   }

   if ( XTAM.CPU >= process.env.UMBRAL_CPU_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Cpu", XTAM.CPU,serial]  )
   }
   if ( XTAM.GPU >= process.env.UMBRAL_GPU_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Gpu", XTAM.GPU,serial]  )
   }
   if ( XTAM.RAM >= process.env.UMBRAL_RAM_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Ram", XTAM.RAM,serial]  )
   }
   if ( XTAM.TempCPU >= process.env.UMBRAL_TEMPCPU_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Temperatura Cpu", XTAM.TempCPU,serial]  )
   }
   if ( XTAM.TempGPU >= process.env.UMBRAL_TEMPGPU_BTA_MIN ) {
    dataAlarms.push([id_cc,descripcion,"Temperatura Gpu", XTAM.TempGPU,serial]  )
   }
   if ( XTAM.DiskUse >= process.env.UMBRAL_DISKUSE_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Uso Disco1", XTAM.DiskUse,serial]  )
   }
   if ( XTAM.DiskUse2 >= process.env.UMBRAL_DISKUSE2_BTA_MAX ) {
    dataAlarms.push([id_cc,descripcion,"Uso Disco2", XTAM.DiskUse2,serial]  )
   }

    //console.log("  arreglo de alrmas   ", dataAlarms);
    dataAlarms.forEach(item => {
        selectAlarms(item[0],item[1],item[2],item[3],item[4])
    });

    
}

function renameKeys(obj, newKeys) {
    const entries = Object.keys(obj).map(key => {
      const newKey = newKeys[key] || key;
      return {[newKey]: obj[key]};
    });
    return Object.assign({}, ...entries);
}

function addDataAlarms(dataa,id_cc,descripcion,serial) {
    for(const [key, value] of Object.entries(dataa)){
        if (value == 'STOP') {
                dataAlarms.push([id_cc,descripcion,key, value,serial]  )
        }        
    }
}
   

function selectAlarms(fk_xtam,sitio,tipo, valor,serial)  {   
    con.query(`SELECT id_alarm, FK_xtam,sitio, tipo,valor,DATE_FORMAT(date (fecha_alarma), '%d/%m/%Y') as fecha ,
    time(fecha_alarma) as hora,FK_estado , fecha_respuesta  FROM xtam_alarms 
    WHERE FK_xtam = ${fk_xtam}  and tipo = "${tipo}" 
    order by fecha_alarma desc`,
    (error, results, fields) =>
    {
        if (error) {
            return console.error(error.message);
            saveLog (`Ejecutar la actualizacion de camaras en la base de datos del c4 : ${id_cc}, el error es: ${error.message},fecha: ${date_server()} `)
        }
        if (results.length == 0) {
            console.log("Puede insertar en insertAlarms");
            //insertar 
            insertAlarms (fk_xtam,sitio,tipo, valor,serial ) 
        }else 
        {
            
            const [dias, horas,minutos] = getHoursDates(results[0].fecha,results[0].hora);
            
            if (  
                results[0].FK_estado == 1 &&
                dias >=1  && 
                (results[0].tipo == "Flujo Entrada#1" || results[0].tipo == "Flujo Entrada#2" || results[0].tipo == "Flujo Entrada#3" || results[0].tipo == "Flujo Entrada#4" 
                || results[0].tipo == "Flujo Salida#1" || results[0].tipo == "Flujo Salida#2" || results[0].tipo == "Flujo Salida#3" || results[0].tipo == "Flujo Salida#4"
                || results[0].tipo == "Recording#1" || results[0].tipo == "Recording#2" || results[0].tipo == "Recording#3" || results[0].tipo == "Recording#4" 
                || results[0].tipo == "FTP" || results[0].tipo == "APACHE" || results[0].tipo == "Ping C4" || results[0].tipo == "Ping Robustel"  
                
                ) 
                && (results[0].valor== STOP)) 
            {
                //console.log(` dias> ${dias}  tipo>  ${results[0].tipo}  valor>  ${results[0].valor}  `);
                updateAlarms(results[0].id_alarm,`"Fallo recurrente ${results[0].tipo}, por favor atender el mismo."`)
            }

            if ( 
                horas  >2   && 
                (  results[0].tipo == "Humedad" 
                    || results[0].tipo == "Temperatura Xtam"
                    || results[0].tipo == "Potencia de operación 5v" 
                    || results[0].tipo == "% carga bateria" 
                    || results[0].tipo == "potencia de la señal" 
                    || results[0].tipo == "Servicios caidos" 
                    || results[0].tipo == "Cpu"
                    || results[0].tipo == "Gpu"
                    || results[0].tipo == "Ram"
                    || results[0].tipo == "Temperatura Cpu"
                    || results[0].tipo == "Temperatura Gpu"
                    || results[0].tipo == "Uso Disco1"
                    || results[0].tipo == "Uso Disco2" 
                ) && results[0].FK_estado == 1 
            ) {
                    updateAlarms(results[0].id_alarm,`"Fallo recurrente ${results[0].tipo}, por favor atender el mismo."`)   
            }
            
        }
    });
}

function insertAlarms ( fk_xtam,sitio,tipo, valor,serial) {
    con.query( `INSERT INTO xtam_alarms(FK_xtam,sitio,tipo,valor,FK_estado,fecha_alarma,Fk_serial)
    VALUES
    (${fk_xtam},
    "${sitio}",
    "${tipo}",
    "${valor}",
    1,
    "${date_server_stamp()}","${serial}" )`,
    
    function(err, response)
    {
        if (err) {
            saveLog (`Error al momento de insertar la novedad en xtam_alarms, el error es: ${err.message}, el sitio es ${sitio}, tipo de fallo ${tipo} y el valoes es ${valor},fecha ${date_server()}  `)
        }else {
            console.log('Registros insertados en insertAlarms: ' + response.affectedRows);
        }
    });
}

function updateAlarms(id_alarm, observacion) {
    con.query( `UPDATE xtam_alarms
    SET
    observacion = ${observacion},
    FK_estado = 2,
    puntuacion = 5
    WHERE id_alarm = ${id_alarm}`, function(err, response)
    {
        if (err) {
            saveLog (`Error al momento de actualizar  la novedad en xtam_alarms, el error es: ${err.message},fecha: ${date_server()} `)
        }else {
            console.log('Registros actualizados en xtam_alarms: ' + response.affectedRows);
        }
    });
}

// obtener fecha y hora 
function getHoursDates( fecha, hora) {
    fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
    fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');
    dayss = fecha_server.diff(fecha_format, 'days', true);          //difrenecia en dias
    hourss = fecha_server.diff(fecha_format, 'hours', true);          //difrenecia en horas
    minutess = fecha_server.diff(fecha_format, 'minutes', true); // diferencia en minutos
    return [dayss, hourss, minutess];
}   


function CriticalLevel(telemetria,XTAM)
{   
    min = Math.ceil(0);
    max = Math.floor(100);
    return Math.floor(Math.random() * (max - min) + min);
    try 
    {   
        let criticality = 0;   
        console.log('Ingresados a la funcion de nivel de criticidad: ');
    
        if ( (XTAM.FlujosOut.OUTSTC1===NULLL || XTAM.FlujosOut.OUTSTC1=== UNDEFINNED) && 
                (XTAM.FlujosOut.OUTSTC2===NULLL || XTAM.FlujosOut.OUTSTC2=== UNDEFINNED) &&
                (XTAM.FlujosOut.OUTSTC3===NULLL || XTAM.FlujosOut.OUTSTC3=== UNDEFINNED) &&
                (XTAM.FlujosOut.OUTSTC4===NULLL || XTAM.FlujosOut.OUTSTC4=== UNDEFINNED) &&

                (XTAM.FlujosIn.INSTC1===NULLL || XTAM.FlujosIn.INSTC1=== UNDEFINNED) &&
                (XTAM.FlujosIn.INSTC2===NULLL || XTAM.FlujosIn.INSTC2=== UNDEFINNED) &&
                (XTAM.FlujosIn.INSTC3===NULLL || XTAM.FlujosIn.INSTC3=== UNDEFINNED) &&
                (XTAM.FlujosIn.INSTC4===NULLL || XTAM.FlujosIn.INSTC4=== UNDEFINNED) &&

                (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED ) &&
                (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED ) &&
                (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED ) &&
                (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED )
            )
            {
                return 100;
        }
        else {

                //Validamos los Servicios
                if  (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED  || XTAM.Services.FTP ==='STOP' || XTAM.Services.FTP ==='OFF') {
                    return 100;
                }
                if  (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED || XTAM.Services.APACHE ==='STOP' || XTAM.Services.APACHE ==='OFF') {
                    return 100;
                }
                if  (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED || XTAM.Services.PingC4 ==='STOP' || XTAM.Services.PingC4 ==='OFF' ){
                    return 100;
                }
                if  (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED || XTAM.Services.PingRobustel ==='STOP' || XTAM.Services.PingRobustel ==='OFF'  ) {
                    return 100;
                }

                //Validamos los flujos de Salida del video        
                if  (XTAM.FlujosOut.OUTSTC1 !== 'OFF') {            
                    if (XTAM.FlujosOut.OUTSTC1 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosOut.OUTSTC2 !== 'OFF') {            
                    if (XTAM.FlujosOut.OUTSTC2 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosOut.OUTSTC3 !== 'OFF') {            
                    if (XTAM.FlujosOut.OUTSTC3 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosOut.OUTSTC4 !== 'OFF') {            
                    if (XTAM.FlujosOut.OUTSTC4 ==='STOP')
                        criticality=criticality +25;
                }

                if (criticality >= 100){
                    return 100;
                }

                //Validamos los flujos de Entrada del video        
                if  (XTAM.FlujosIn.INSTC1 !== 'OFF') {            
                    if (XTAM.FlujosIn.INSTC1 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosIn.INSTC2 !== 'OFF') {            
                    if (XTAM.FlujosIn.INSTC2 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosIn.INSTC3 !== 'OFF') {            
                    if (XTAM.FlujosIn.INSTC3 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.FlujosIn.INSTC4 !== 'OFF') {            
                    if (XTAM.FlujosIn.INSTC4 ==='STOP')
                        criticality=criticality +25;
                }

                if (criticality >= 100){
                    return 100;
                }

                //Validamos el estado de las grabaciones
                if  (XTAM.Recordings.RDC1 !== 'OFF') {            
                    if (XTAM.Recordings.RDC1 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.Recordings.RDC2 !== 'OFF') {            
                    if (XTAM.Recordings.RDC2 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.Recordings.RDC2 !== 'OFF') {            
                    if (XTAM.Recordings.RDC2 ==='STOP')
                        criticality=criticality +25;
                }

                if  (XTAM.Recordings.RDC2 !== 'OFF') {            
                    if (XTAM.Recordings.RDC2 ==='STOP')
                        criticality=criticality +25;
                }

                if (criticality >= 100){
                    return 100;
                }         
                
                //Revisamos las variables del equipo XTAM REMOTO

                if ( telemetria.temp != UNDEFINNED) 
                {
                    if (telemetria.temp.toFixed(2) >= 60 )
                        criticality=criticality +10;
                } 

                if ( telemetria.hum > CEROO) 
                {
                    if (telemetria.hum.toFixed(2) >= 90 )
                        criticality=criticality +10;
                    //console.log(  "Temperatura indefinida  " )             
                } 


                if ( telemetria.CUP != UNDEFINNED) 
                {
                    if (XTAM.CUP.toFixed(2) >= 70 )
                        criticality=criticality +15;                        
                } 
                
                if ( telemetria.Vop5V > CEROO) 
                {
                    if (telemetria.Vop5V.toFixed(2) >= 5.3 )
                        criticality=criticality +15;                           
                } 

                if ( telemetria.Wop5V > CEROO) 
                {
                    if (telemetria.Wop5V.toFixed(2) >= 3.8 )
                        criticality=criticality +20;              
                } 

                if ( telemetria.Vop12V > CEROO) 
                {
                    if (telemetria.Vop12V.toFixed(2) >= 12.7 )
                        criticality=criticality +20;                
                } 

                if ( telemetria.Wop12V > CEROO) 
                {
                    if (telemetria.Wop12V.toFixed(2) >= 1.9 )
                        criticality=criticality +20;              
                } 
                if ( telemetria.bat > CEROO) 
                {
                    if (telemetria.bat >= 95 )
                        criticality=criticality +20;             
                }

                //if ( telemetria.red > CEROO) 
                //{
                //    if (telemetria.red >= 3 )
                //        criticality=criticality +1;             
                //} 

                if ( telemetria.Rdb > CEROO) 
                {
                    if (telemetria.Rdb >= 110 )
                        criticality=criticality +10;    
                    
                } 

                if ( XTAM.GPU > CEROO) 
                {
                    if (XTAM.GPU >= 70 )
                        criticality=criticality +15;            
                } 
                
                if ( XTAM.CPU > CEROO) 
                {
                    if (XTAM.CPU >= 70 )
                        criticality=criticality +15;               
                } 
                if ( XTAM.RAM > CEROO) 
                {
                    if (XTAM.RAM >= 5000 )
                        criticality=criticality +20;  
                    
                }
                if ( XTAM.TempCPU > CEROO) 
                {
                    if (XTAM.TempCPU >= 70 )
                        criticality=criticality +20;              
                }
                if ( XTAM.TempGPU > CEROO) 
                {
                    if (XTAM.TempGPU >= 70 )
                        criticality=criticality +20;               
                }
                
                if ( XTAM.DiskUse > CEROO) 
                {
                    if (XTAM.DiskUse >= 800 )
                        criticality=criticality +60;             
                }
            }      
    } 
    catch (error) {
        criticality=criticality +50;    
        //saveLog (`Error al momento de insertar la novedad en xtam news, el error encontrado es: ${err.message}, fecha:${date_server()} , la consulta es: ${query} ,data  ${data}`)
    }
    finally {
        return criticality > 100 ? 100 : criticality;
    }
    
}






// constantes
const UNDEFINNED = undefined; 
const CEROO = 0; 
const NULLL = null;
// Importacion de librerias
var mysql = require('mysql');
const util = require('util');
var moment = require('moment');
const fs = require('fs');
var parseInt = require('parse-int');
 

// create a connection variable with the required details (Telemetria)
var con = mysql.createConnection({
    host: "10.147.20.113",
    user: "xtam",
    password: 'Xtam2021*',
    database: 'xtamtelemetria'
});

// create conexion con la base de datos de abajo *(c4)
//crear conexion mysql xtamDb Abajo o c4.
var con_xtamDB = mysql.createConnection({
    host: "xtam-video-dev.cchfdbjtfv0t.us-east-2.rds.amazonaws.com",   //Cambiar por la ip del C4
    user: "admin",
    password: '723$YAFsemneujgJYjRDBHA&maNH4eTA',
    database: 'xtamvideo-dev'
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

/*  CONEXION SERVIDOR MOSQUITO  */
const mqtt = require('mqtt');
const { log, Console } = require('console');
const host = '18.189.242.242'
const port = '1883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

//Conexion
const connectUrl = `mqtt://${host}:${port}`
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'prueba', //test
    password: 'prueba',//test
    reconnectPeriod: 1000,
})

//Suscribirse
const topic = 'XTAM/DATA'
client.on('connect', () => {
    //console.log('Connected:  ' + client.connected)
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`)
    })
})

//desde aqui

// CONEXION AL SERVIDOR DE MOSQUITO 
client.on('message', (topic, payload) => {
    try {
        let response = JSON.parse(payload.toString())
        let {telemetria,XTAM,ID } = response
        // llamo a la logica de la base de datos
        operation_db( response.ID , response)  //response.ID    Testt
    } catch (error) {
        console.log(error);
    }
})

function operation_db(id_module,telemetry) {
    try {
         // Calcular llave foranea del xtam
        con.query(`call calculate_id ("${id_module}")`, (error, results, fields) => 
        {
            
            if (error) {
                return console.error(error.message);
                saveLog (`Error al momento de calcular operacion db ${id_module} , el error es: ${error.message}`)
            }
            let [RowDataPacket] = results[0]
            if (RowDataPacket === undefined) {
                return
                //console.log(" No existe el id module: ");
                //saveLog (`Error , no existe el modulo: id_module  , el error es: ${error.message}`)
            } else
            {
                console.log("  step 1 ");
                let {id} = RowDataPacket
                console.log("fk xtam : " + id);
                ultimate_new (id,telemetry )
            }
            //con.end();
        });
    } catch (er) {
        console.log("exepcion producida en la funcion : operation_db " );
        saveLog (`Exepcion producida en la funcion : operation_db  ${date_server()} `)
    }
}

function ultimate_new (fk_xtam,telemetry )
{
    try 
    {
         // existe el xtam en la tabla novedades (xtam_news)
        con.query(` SELECT x.id,x.ipserver,x.id_modulo, DATE_FORMAT(date (xn.fecha), '%d/%m/%Y') as fecha ,
        time(xn.fecha) as hora ,xn.Id_xtam_news  FROM xtamtelemetria.xtam_news  xn
        INNER JOIN xtams x on x.id  = xn.Fk_xtam
        where xn.Fk_xtam =  ${fk_xtam}   order by xn.fecha desc limit 1`, (error, results, fields) => 
        {
            if (error) {
                //return console.error(error.message);
                //Guardar error en el log
                saveLog (`Error al momento de calcular la ultima novedad para el xtam ${fk_xtam} , el error es: ${error.message}`)
            }
            if (results.length == 0) {
                console.log("haga el insert");
                let {telemetria,XTAM,ID} = telemetry
                
                insert_xtam_news(fk_xtam,telemetria,XTAM,ID ) 
                
                insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID )
            } else {
                
                //ya existe el primer registo del equipo xtam en la base de datos
                let {fecha,hora,Id_xtam_news} = results[0]

                fecha_format = moment(`${fecha} ${hora}`, 'DD/MM/YYYY HH:mm:ss');
                fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');

                minutess = fecha_server.diff(fecha_format, 'minutes', true); //difrenecia en minutos
                //console.log("************************************minutos   han pasado::**************** " + minutess);
                const miutes_insert = howMinutes(); //camniar y hacer dinamico
                // validacion tiempo
                if (minutess >= miutes_insert) 
                {
                    //insertar informacion
                    let {telemetria,XTAM,ID} = telemetry
                    insert_xtam_news(fk_xtam,telemetria,XTAM,ID ) 
                    console.log("Entrassss  ",XTAM.FlujosOut.OUTSTC1);
                    insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID )
                    exec_uptCameras(fk_xtam,XTAM)
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
        console.log("telemetria  ",telemetria );    
        console.log("******************************");     
        console.log("XTAM  ",XTAM );

        var  data = []; 
        /*console.log( "  temp ", telemetria.tem, "   hum ", telemetria.hum,  "   Wop5V", telemetria.Wop5V,"  Vop12V ",telemetria.Vop12V
        ,"   Wop12V ", telemetria.Wop12V, " bat ", telemetria.bat, "  red ", telemetria.red, " Rdb ",  telemetria.Rdb);*/

        // validaciones vienen vacios>
        if ( telemetria.temp != UNDEFINNED) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 4, telemetria.temp])
        } 
        if ( telemetria.CUP != UNDEFINNED) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 24, XTAM.CUP])
        } 
        if ( telemetria.hum > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 5, telemetria.hum])
        } 
        if ( telemetria.Vop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 12, telemetria.Vop5V])
        } 
        if ( telemetria.Wop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 6, telemetria.Wop5V])
        } 
        if ( telemetria.Vop12V > CEROO) 
        {
            data.push([fk_xtam, 17, telemetria.Vop12V])
        } 
        if ( telemetria.Wop12V > CEROO) 
        {
            data.push( [fk_xtam, 18, telemetria.Wop12V] )
        } 
        if ( telemetria.bat > CEROO) 
        {
            data.push([fk_xtam, 9,  telemetria.bat])
        }
        if ( telemetria.red > CEROO) 
        {
            data.push([fk_xtam, 15, telemetria.red])
        } 
        if ( telemetria.Rdb > CEROO) 
        {
            data.push([fk_xtam, 10, telemetria.Rdb])
        } 
      

        if ( XTAM.GPU > CEROO) 
        {
            data.push([fk_xtam, 25, XTAM.GPU])
        } 
        
        if ( XTAM.CPU > CEROO) 
        {
            data.push([fk_xtam, 24, XTAM.CPU])
        } 
        if ( XTAM.RAM > CEROO) 
        {
            data.push([fk_xtam, 26, XTAM.RAM])
        }
        if ( XTAM.TempCPU > CEROO) 
        {
            data.push([fk_xtam, 27, XTAM.TempCPU])
        }
        if ( XTAM.TempGPU > CEROO) 
        {
            data.push([fk_xtam, 28, XTAM.TempGPU])
        }
        
        if ( XTAM.DiskUse > CEROO) 
        {
            data.push([fk_xtam, 30, XTAM.DiskUse])
        }

        //Insertar en la base de datos>
        var query = `INSERT INTO xtamtelemetria.xtam_news (Fk_xtam, Fk_categoria, valor) VALUES ?`;
        
        con.query(query, [data], function(err, response){
            if (err) {
                saveLog (`Error al momento de insertar la novedad en xtam news, el error es: ${err.message}, fecha:${date_server()}`)
                return console.log(err.message);
            }
            else {
                console.log('Registros insertados: ' + response.affectedRows );
            }
        });
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : ultimate_new, fecha:${date_server()}`);
    }
}

//insertar novedad en xtam services news
function insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID)
{
    
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
        
        con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},47,null)`, function(err, response)
        {
                if (err) {
                    saveLog (`Error al momento de insertar la novedad en xtam_alarmss, el error es: ${err.message}`)
                }
                else {
                    console.log('Xtam con valores nulos, Registros insertados: ' + response.affectedRows);
                }
        });
   }else
   {
        //validar por servicios xtam
        if  (XTAM.FlujosOut.OUTSTC1===NULLL || XTAM.FlujosOut.OUTSTC1=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},37,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss  , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de salida 1  null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosOut.OUTSTC2===NULLL || XTAM.FlujosOut.OUTSTC2=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},38,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de salida 2 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosOut.OUTSTC3===NULLL || XTAM.FlujosOut.OUTSTC3=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},39,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de salida 3 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosOut.OUTSTC4===NULLL || XTAM.FlujosOut.OUTSTC4=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},40,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de salida 4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosIn.INSTC1===NULLL || XTAM.FlujosIn.INSTC1=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},33,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de entrada 4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosIn.INSTC2===NULLL || XTAM.FlujosIn.INSTC2=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},34,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de entrada 2 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosIn.INSTC3===NULLL || XTAM.FlujosIn.INSTC3=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},35,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de entrada 3 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.FlujosIn.INSTC4===NULLL || XTAM.FlujosIn.INSTC4=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},36,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con flujo de entrada 4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Recordings.RDC1===NULLL || XTAM.Recordings.RDC1=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},41,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con grabacion 1 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Recordings.RDC2===NULLL || XTAM.Recordings.RDC2=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},42,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con grabacion 2 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Recordings.RDC3===NULLL || XTAM.Recordings.RDC3=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},43,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con grabacion 3 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Recordings.RDC4===NULLL || XTAM.Recordings.RDC4=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},44,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con grabacion 4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Recordings.RDC4===NULLL || XTAM.Recordings.RDC4=== UNDEFINNED) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},44,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con grabacion 4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED ) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},2,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con FTP null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED ) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},3,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con APACHE null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED ){
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},31,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con PingC4 null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        if  (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED ) {
            //alarma salida 1 null
            con.query(`INSERT INTO xtamtelemetria.xtam_alarmss (Fk_xtam, Fk_categoria, valor) VALUES (${fk_xtam},32,null)`  , function(err, response)
            {
                    if (err) {
                        saveLog (`Error al momento de insertar la novedad en xtam_alarmss , el error es: ${err.message}`)
                    }
                    else {
                        console.log('Xtam con PingRobustel null, Registros insertados: ' + response.affectedRows);
                    }
            });
        }
        let data = [];
        console.log("Xtams>> ", XTAM); 
        console.log("*********************************************");
        
        if (XTAM.Services.FTP != NULLL )  {
            
            data.push( [fk_xtam, 2, XTAM.Services.FTP] )
        }
        if (XTAM.Services.APACHE != NULLL )  {
            
            data.push( [fk_xtam, 3, XTAM.Services.APACHE] )
        }
        if (XTAM.Services.PingC4 != NULLL )  {
            
            data.push( [fk_xtam, 31, XTAM.Services.PingC4] )
        }
        if (XTAM.Services.PingRobustel != NULLL )  {
            
            data.push( [fk_xtam, 32, XTAM.Services.PingRobustel] )
        }
        if (XTAM.FlujosIn.INSTC1 != NULLL )  {
        
            data.push( [fk_xtam, 33, XTAM.FlujosIn.INSTC1] )
        }
        if (XTAM.FlujosIn.INSTC2 != NULLL )  {
        
            data.push( [fk_xtam, 34, XTAM.FlujosIn.INSTC2] )
        }
        if (XTAM.FlujosIn.INSTC3 != NULLL )  {
        
            data.push( [fk_xtam, 35, XTAM.FlujosIn.INSTC3] )
        }
        if (XTAM.FlujosIn.INSTC4 != NULLL )  {
        
            data.push( [fk_xtam, 36, XTAM.FlujosIn.INSTC4] )
        }


        if (XTAM.FlujosOut.OUTSTC1 != NULLL )  {
        
            data.push( [fk_xtam, 37, XTAM.FlujosOut.OUTSTC1] )
        }
        if (XTAM.FlujosOut.OUTSTC2 != NULLL )  {
            
            data.push( [fk_xtam, 38, XTAM.FlujosOut.OUTSTC2] )
        }
        if (XTAM.FlujosOut.OUTSTC3 != NULLL )  {
            
            data.push( [fk_xtam, 39, XTAM.FlujosOut.OUTSTC3] )
        }
        if (XTAM.FlujosOut.OUTSTC4 != NULLL )  {
            
            data.push( [fk_xtam, 40, XTAM.FlujosOut.OUTSTC4] )
        }

        if (XTAM.Recordings.RDC1 != NULLL )  {
            
            data.push( [fk_xtam, 41, XTAM.Recordings.RDC1 ] )
        }
        if (XTAM.Recordings.RDC2 != NULLL )  {
            
            data.push( [fk_xtam, 42, XTAM.Recordings.RDC2 ] )
        }
        if (XTAM.Recordings.RDC3 != NULLL )  {
            
            data.push( [fk_xtam, 43, XTAM.Recordings.RDC3 ] )
        }
        if (XTAM.Recordings.RDC4 != NULLL )  {
            
            data.push( [fk_xtam, 44, XTAM.Recordings.RDC4 ] )
        }

        console.log("EWste es mi data ", data); 
        console.log("Quien es el xtam >>", fk_xtam);
        //insertar 
        let query = `INSERT INTO xtamtelemetria.xtam_services_news (Fk_xtam, Fk_categoria, valor) VALUES ?`;
        con.query(query, [data], function(err, response)
        {
            if (err) {
                saveLog (`Error al momento de insertar la novedad en xtam services news ${data} , el error es: ${err.message}`)
            }
            else {
                console.log('Registros insertados: ' + response.affectedRows);
            }
        });
   }
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

function howMinutes () {
    //tenga en cuenta la ruta del archivo del cual se extraen los minutos
    let archivo = fs.readFileSync('C:/Users/Administrator/Documents/minutes.txt', 'utf-8');
    let whatMinutes = JSON.parse(archivo);
    let minutuess = parseInt(whatMinutes.Minutes) ;
    return  minutuess;
}



//Actualizar base de datos C4
function exec_uptCameras (id_cc, XTAM)
{
    con_xtamDB.query(`SELECT * FROM telemetria_status   WHERE id_centrocomercial = ${id_cc} limit 1`,
    (error, results, fields) =>
    {
        if (error) {
            return console.error(error.message);
            saveLog (`Ejecutar la actualizacion de camaras en la base de datos del c4 : ${id_cc}, el error es: ${error.message}`)
            //insertar aqui
        }
        if (results.length == 0) {
            console.log(`No hay datos del id_cc:   ${id_cc} `);
            console.log("**********************************************");
            //  Insertar en la tabla telemetria_status si no se tiene registro
            /*console.log(`INSERT INTO telemetria_status (id_centrocomercial, flujo_entrada1, flujo_entrada2, flujo_entrada3,
                 flujo_entrada4, flujo_salida1, flujo_salida2, flujo_salida3, flujo_salida4, recording1, recording3, recording4,
                  recording2, ping_c4, ping_robustel, apache, FTP, ultima_actualizacion)
            VALUES (${id_cc}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,"${date_server_stamp()}");`);
            */
            
            
            con_xtamDB.query( `INSERT INTO telemetria_status (id_centrocomercial, flujo_entrada1, flujo_entrada2, flujo_entrada3,
                flujo_entrada4, flujo_salida1, flujo_salida2, flujo_salida3, flujo_salida4, recording1, recording3, recording4,
                recording2, ping_c4, ping_robustel, apache, FTP, ultima_actualizacion)
                VALUES (${id_cc}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,"${date_server_stamp()}");`, function(err, response)
            {
                if (err) {
                    saveLog (`Error al momento de insertar en la tabla telemetria_status, el primer registro del centro comercial $${id_cc}  , el error es: ${err.message}`)
                }
                else {
                    console.log('Insertado con exito en la tabla telemetria_status: ' + response.affectedRows);
                }
            });
            
        }else
        {
            //console.log( " " +results[0].descripcion);
            let setFields = "";
            if (results[0].flujo_entrada1 != XTAM.FlujosIn.INSTC1){
                setFields+= `flujo_entrada1='${XTAM.FlujosIn.INSTC1}',`;
            }
            if (results[0].flujo_entrada2 != XTAM.FlujosIn.INSTC2){
                setFields+= `flujo_entrada2='${XTAM.FlujosIn.INSTC2}',`;
            }
            if (results[0].flujo_entrada3 != XTAM.FlujosIn.INSTC3){
                setFields+= `flujo_entrada3='${XTAM.FlujosIn.INSTC3}',`;
            }
            if (results[0].flujo_entrada4 != XTAM.FlujosIn.INSTC4){
                setFields+= `flujo_entrada4='${XTAM.FlujosIn.INSTC4}',`;
            }

            if (results[0].flujo_salida1 != XTAM.FlujosOut.OUTSTC1){
                setFields+= `flujo_salida1='${XTAM.FlujosOut.OUTSTC1}',`;
            }
            if (results[0].flujo_salida2 != XTAM.FlujosOut.OUTSTC2){
                setFields+= `flujo_salida2='${XTAM.FlujosOut.OUTSTC2}',`;
            }
            if (results[0].flujo_salida3 != XTAM.FlujosOut.OUTSTC3){
                setFields+= `flujo_salida3='${XTAM.FlujosOut.OUTSTC3}',`;
            }
            if (results[0].flujo_salida4 != XTAM.FlujosOut.OUTSTC4){
                setFields+= `flujo_salida4='${XTAM.FlujosOut.OUTSTC4}',`;
            }

            if (results[0].recording1 != XTAM.Recordings.RDC1){
                setFields+= `recording1='${XTAM.Recordings.RDC1}',`;
            }
            if (results[0].recording2 != XTAM.Recordings.RDC2){
                setFields+= `recording2='${XTAM.Recordings.RDC2}',`;
            }
            if (results[0].recording3 != XTAM.Recordings.RDC3){
                setFields+= `recording3='${XTAM.Recordings.RDC3}',`;
            }
            if (results[0].recording4 != XTAM.Recordings.RDC4){
                setFields+= `recording4='${XTAM.Recordings.RDC4}',`;
            }

            if (results[0].ping_c4 != XTAM.Services.PingC4 ){
                setFields+= `ping_c4='${XTAM.Services.PingC4}',`;
            }
            if (results[0].ping_robustel != XTAM.Services.PingRobustel ){
                setFields+= `ping_robustel='${XTAM.Services.PingRobustel}',`;
            }
            if (results[0].apache != XTAM.Services.APACHE ){
                setFields+= `apache='${XTAM.Services.APACHE}',`;
            }
            if (results[0].ftp != XTAM.Services.FTP ){
                setFields+= `ftp='${XTAM.Services.FTP}',`;
            }

            
            if (setFields.charAt(setFields.length - 1)===",") {
                console.log("El ultimo caracter es una coma ");
                setFields = setFields.substring(0, setFields.length - 1);
            }
            if (setFields.charAt(0)===",") {
                console.log("El Primero caracter es una coma ");
                setFields = setFields.substring(1, setFields.length );
            }
               

            if ( setFields !="" ) {
                con_xtamDB.query(`UPDATE telemetria_status
                SET ${setFields}
                WHERE id_centrocomercial = ${id_cc} `,
                    (error, results, fields) =>{
                        if (error) {
                            return console.error("Error al momento de actualizar camaras news: " +error.message);
                        }else{
                            console.log("Actualizacion completada.");
                        }
                    });
            }
        }
    });
}




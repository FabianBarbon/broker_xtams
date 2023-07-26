require("dotenv").config();
// constantes
const UNDEFINNED = undefined; 
const CEROO = 0; 
const NULLL = null;
const STOP = "STOP";
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


//crear conexion ALaramas .
var con_alarmDB = mysql.createConnection({
    host: "xtam-video-dev.cchfdbjtfv0t.us-east-2.rds.amazonaws.com",   //Cambiar por la ip del C4
    user: "admin",
    password: '723$YAFsemneujgJYjRDBHA&maNH4eTA',
    database: 'xtamalarmdb-dev'
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

let dataAlarms = [] 
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
                let {id, descripcion} = RowDataPacket
                console.log("fk xtam : " + id);
                ultimate_new (id,telemetry,descripcion )
            }
            //con.end();
        });
    } catch (er) {
        console.log("exepcion producida en la funcion : operation_db " );
        saveLog (`Exepcion producida en la funcion : operation_db  ${date_server()} `)
    }
}

function ultimate_new (fk_xtam,telemetry,descripcion )
{
    try 
    {
        //let desc = descripcion;
        console.log("///////////////////////////////////////////////////////////////////////");
        console.log("descriopcion desde ultimate new  " , descripcion);
         // existe el xtam en la tabla novedades (xtam_news)
        con.query(`SELECT x.id,x.ipserver,x.id_modulo, DATE_FORMAT(date (xn.fecha), '%d/%m/%Y') as fecha ,
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
                insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion )
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
                    insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion )
                    exec_uptCameras(fk_xtam,XTAM,telemetria,descripcion)
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
        //console.log("telemetria  ",telemetria );    
        console.log("******************************");     
        //console.log("XTAM  ",XTAM );
        var  data = []; 
        /*console.log( "  temp ", telemetria.tem, "   hum ", telemetria.hum,  "   Wop5V", telemetria.Wop5V,"  Vop12V ",telemetria.Vop12V
        ,"   Wop12V ", telemetria.Wop12V, " bat ", telemetria.bat, "  red ", telemetria.red, " Rdb ",  telemetria.Rdb);*/

        // validaciones vienen vacios>
        if ( telemetria.temp != UNDEFINNED) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 4, telemetria.temp.toFixed(2)])
        } 
        if ( telemetria.CUP != UNDEFINNED) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 24, XTAM.CUP.toFixed(2)])
        } 
        if ( telemetria.hum > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 5, telemetria.hum.toFixed(2)])
        } 
        if ( telemetria.Vop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 12, telemetria.Vop5V.toFixed(2)])
        } 
        if ( telemetria.Wop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 6, telemetria.Wop5V.toFixed(2)])
        } 
        if ( telemetria.Vop12V > CEROO) 
        {
            data.push([fk_xtam, 17, telemetria.Vop12V.toFixed(2)])
        } 
        if ( telemetria.Wop12V > CEROO) 
        {
            data.push( [fk_xtam, 18, telemetria.Wop12V.toFixed(2)] )
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
            data.push([fk_xtam, 27, XTAM.TempCPU])   ///.toFixed(2)
        }
        if ( XTAM.TempGPU > CEROO) 
        {
            data.push([fk_xtam, 28, XTAM.TempGPU]) //
        }
        
        if ( XTAM.DiskUse > CEROO) 
        {
            data.push([fk_xtam, 30, XTAM.DiskUse])
        }

        //Insertar en la base de datos>
        var query = `INSERT INTO xtamtelemetria.xtam_news (Fk_xtam, Fk_categoria, valor) VALUES ?`;
        
        con.query(query, [data], function(err, response){
            if (err) {
                saveLog (`Error al momento de insertar la novedad en xtam news, el error es: ${err.message}, fecha:${date_server()} , la consulta es: ${query} ,data  ${data}`)
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
function insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID,descripcion)
{
    console.log("Descripcion  ", descripcion);
    
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
        console.log("******************************************************----------------------------");
        console.log("Que ve  ",  fk_xtam,descripcion, "Servicios caidos",);
        console.log("******************************************************----------------------------");

        selectAlarms(fk_xtam,descripcion,"Servicios caidos", null) 
        //insertAlarms(fk_xtam,descripcion, "Servicios caidos", null) //tipo:47
   }else
   {
        //validar por servicios xtam
        if  (XTAM.FlujosOut.OUTSTC1===NULLL || XTAM.FlujosOut.OUTSTC1=== UNDEFINNED) {

            //alarma salida 1 null
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#1", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Salida#1", null)   //tipo:37
        }
        if  (XTAM.FlujosOut.OUTSTC2===NULLL || XTAM.FlujosOut.OUTSTC2=== UNDEFINNED) {
            //alarma salida 1 null
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#2", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Salida#2", null)   //tipo:38
        }
        if  (XTAM.FlujosOut.OUTSTC3===NULLL || XTAM.FlujosOut.OUTSTC3=== UNDEFINNED) {
            //alarma salida 1 null
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#3", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Salida#3", null)   //tipo:39
        }
        if  (XTAM.FlujosOut.OUTSTC4===NULLL || XTAM.FlujosOut.OUTSTC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Salida#4", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Salida#4", null)   //tipo:40
        }
        if  (XTAM.FlujosIn.INSTC1===NULLL || XTAM.FlujosIn.INSTC1=== UNDEFINNED) {
            //alarma salida 1 null
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#1", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Entrada#1", null)   //tipo:33
        }
        if  (XTAM.FlujosIn.INSTC2===NULLL || XTAM.FlujosIn.INSTC2=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#2", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Entrada#2", null)  //tipo:34
        }
        if  (XTAM.FlujosIn.INSTC3===NULLL || XTAM.FlujosIn.INSTC3=== UNDEFINNED) {
            //selectAlarms(fk_xtam,descripcion,"Flujo Entrada#3", null)
            insertAlarms(fk_xtam,descripcion, "Flujo Entrada#3", null)  //tipo:35
        }
        if  (XTAM.FlujosIn.INSTC4===NULLL || XTAM.FlujosIn.INSTC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Flujo Entrada#4", null)
            //insertAlarms(fk_xtam,descripcion, "Flujo Entrada#4", null)  //tipo:36
        }
        if  (XTAM.Recordings.RDC1===NULLL || XTAM.Recordings.RDC1=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#1", null)
            //insertAlarms(fk_xtam,descripcion, "Recording#1", null)       //tipo:41
        }
        if  (XTAM.Recordings.RDC2===NULLL || XTAM.Recordings.RDC2=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#2", null)
            //insertAlarms(fk_xtam,descripcion, "Recording#2", null)      //tipo:42
        }
        if  (XTAM.Recordings.RDC3===NULLL || XTAM.Recordings.RDC3=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#3", null)
            //insertAlarms(fk_xtam,descripcion, "Recording#3", null)      //tipo:43
        }
        if  (XTAM.Recordings.RDC4===NULLL || XTAM.Recordings.RDC4=== UNDEFINNED) {
            selectAlarms(fk_xtam,descripcion,"Recording#4", null)
            //insertAlarms(fk_xtam,descripcion, "Recording#4", null)      //tipo:44
        }
        if  (XTAM.Services.FTP===NULLL || XTAM.Services.FTP===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"FTP", null)
            //insertAlarms(fk_xtam,descripcion, "FTP", null)              //tipo:2
        }
        if  (XTAM.Services.APACHE===NULLL || XTAM.Services.APACHE===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"APACHE", null)
            //insertAlarms(fk_xtam,descripcion, "APACHE", null)           //tipo:3
        }
        if  (XTAM.Services.PingC4===NULLL || XTAM.Services.PingC4===UNDEFINNED ){
            selectAlarms(fk_xtam,descripcion,"Ping C4", null)
            //insertAlarms(fk_xtam,descripcion, "Ping C4", null)                 //tipo:31
        }
        if  (XTAM.Services.PingRobustel===NULLL || XTAM.Services.PingRobustel===UNDEFINNED ) {
            selectAlarms(fk_xtam,descripcion,"Ping Robustel", null)
            //insertAlarms(fk_xtam,descripcion, "Ping Robustel", null)                 //tipo:32
        }
        let data = [];
        //console.log("Xtams>> ", XTAM); 
        //console.log("*********************************************");
        
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


// borrar telemetria status y en c.c del dev 
//Actualizar base de datos C4
function exec_uptCameras (id_cc, XTAM,telemetria,descripcion)
{   
    //console.log("----------------------------------------------------");
    //console.log(   "XTAM  " ,XTAM);
    //console.log(   "telemetria  " ,telemetria);
    //console.log("----------------------------------------------------");
    let { FlujosIn,FlujosOut,Recordings,Services } = XTAM
    const newKeysFlujosIn  = {INSTC1: 'Flujo Entrada#1', INSTC2: 'Flujo Entrada#2',INSTC3: 'Flujo Entrada#3', INSTC4: 'Flujo Entrada#4'};
    const newKeysFlujosOut = {OUTSTC1: 'Flujo Salida#1', OUTSTC2: 'Flujo Salida#2',OUTSTC3: 'Flujo Salida#3', OUTSTC4: 'Flujo Salida#4'};
    const newKeysRecordings = {RDC1: 'Recording#1', RDC2: 'Recording#2',RDC3: 'Recording#3', RDC4: 'Recording#4'};
    const newKeysServices = {FTP: 'FTP', APACHE: 'APACHE',PingC4: 'Ping C4', PingRobustel: 'Ping Robustel'};
     
    let C = renameKeys(FlujosIn, newKeysFlujosIn);
    let D = renameKeys(FlujosOut, newKeysFlujosOut);
    let E = renameKeys(Recordings, newKeysRecordings);
    let  F = renameKeys(Services, newKeysServices);

    addDataAlarms(C,id_cc,descripcion)
    addDataAlarms(D,id_cc,descripcion)
    addDataAlarms(E,id_cc,descripcion)
    addDataAlarms(F,id_cc,descripcion)

   if ( telemetria.temp >= process.env.UMBRAL_Temperatura) {
        dataAlarms.push([id_cc,descripcion,"Temperatura Xtam", telemetria.temp]  )
   }
   if ( telemetria.hum >= process.env.UMBRAL_Humedad) {
    dataAlarms.push([id_cc,descripcion,"Humedad", telemetria.hum]  )
   } 
   if ( telemetria.Wop5V >= process.env.UMBRAL_POWOPERATION) {
    dataAlarms.push([id_cc,descripcion,"Potencia de operación 5v", telemetria.Wop5V]  )
   } 
   if ( telemetria.bat >= process.env.UMBRAL_PERCENT_BATTERY) {
    dataAlarms.push([id_cc,descripcion,"% carga bateria", telemetria.bat]  )
   } 
   if ( telemetria.Rdb >= process.env.UMBRAL_RDB) {
    dataAlarms.push([id_cc,descripcion,"potencia de la señal", telemetria.Rdb]  )
   } 

    //console.log("  arreglo de alrmas   ", dataAlarms);
    dataAlarms.forEach(item => {
        selectAlarms(item[0],item[1],item[2],item[3])
    });
}

function renameKeys(obj, newKeys) {
    const entries = Object.keys(obj).map(key => {
      const newKey = newKeys[key] || key;
      return {[newKey]: obj[key]};
    });
    return Object.assign({}, ...entries);
}

function addDataAlarms(dataa,id_cc,descripcion) {
    for(const [key, value] of Object.entries(dataa)){
        if (value == 'STOP') {
                dataAlarms.push([id_cc,descripcion,key, value]  )
        }        
    }
}
   

function selectAlarms(fk_xtam,sitio,tipo, valor)  {   
    con.query(`SELECT id_alarm, FK_xtam,sitio, tipo,valor,DATE_FORMAT(date (fecha_alarma), '%d/%m/%Y') as fecha ,
    time(fecha_alarma) as hora,FK_estado , fecha_respuesta  FROM xtam_alarms 
    WHERE FK_xtam = ${fk_xtam}  and tipo = "${tipo}" 
    order by fecha_alarma desc`,
    (error, results, fields) =>
    {
        if (error) {
            return console.error(error.message);
            saveLog (`Ejecutar la actualizacion de camaras en la base de datos del c4 : ${id_cc}, el error es: ${error.message}`)
        }
        if (results.length == 0) {
            console.log("Puede insertar");
            //insertar 
            insertAlarms (fk_xtam,sitio,tipo, valor ) 
        }else 
        {
            
            const [dias, horas] = getHoursDates(results[0].fecha);
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
                horas  >1  && 
                (  results[0].tipo == "Humedad" 
                || results[0].tipo == "Temperatura Xtam"
                || results[0].tipo == "Potencia de operación 5v" 
                || results[0].tipo == "% carga bateria" 
                || results[0].tipo == "potencia de la señal" 
                || results[0].tipo == "Servicios caidos" 
                ) && results[0].FK_estado == 1 
            ) {
                    updateAlarms(results[0].id_alarm,`"Fallo recurrente ${results[0].tipo}, por favor atender el mismo."`)   
            }
            
        }
    });
}

function insertAlarms ( fk_xtam,sitio,tipo, valor) {
    con.query( `INSERT INTO xtam_alarms(FK_xtam,sitio,tipo,valor,FK_estado,fecha_alarma)
    VALUES
    (${fk_xtam},
    "${sitio}",
    "${tipo}",
    "${valor}",
    1,
    "${date_server_stamp()}")`, function(err, response)
    {
        if (err) {
            saveLog (`Error al momento de insertar la novedad en xtam_alarms, el error es: ${err.message}, el sitio es ${sitio}, tipo de fallo ${tipo} y el valoes es ${valor} `)
        }else {
            console.log('Registros insertados: ' + response.affectedRows);
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
            saveLog (`Error al momento de actualizar  la novedad en xtam_alarms, el error es: ${err.message}`)
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
    hourss = fecha_server.diff(fecha_format, 'hours', true);          //difrenecia en dias
    return [dayss, hourss]
}   

// constantes
const UNDEFINNED = undefined; 
const CEROO = 0; 

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

/*  PROCESO PARA CALCULAR Y FORMATEAR LA FECHA DEL SERVIDOR  */
function date_server() {
    try {
        var hoy = new Date();
        var fecha2 = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear();date_server
        fecha2 = fecha2.replaceAll("-", "/")
        var hora2 = hoy.getHours() + ':' + hoy.getMinutes() + ':' + hoy.getSeconds();
        var fecha_server = `${fecha2} ${hora2}`;
        return fecha_server;
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : date_server, fecha:${date_server()}`);        
    }
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
    username: 'test',
    password: 'test',
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
        saveLog (`Exepcion producida al momento de conectarse con el servidor de mosquito, fecha:${date_server()}`);  
    }
})

function operation_db(id_module,telemetry) {
    try {
         // Calcular llave foranea del xtam
        con.query(`call calculate_id ("${id_module}")`, (error, results, fields) => 
        {
            console.log("Modulo: " + id_module);
            if (error) {
                console.error(error.message);
                saveLog (`Error al momento de calcular operacion db ${id_module} , el error es: ${error.message}, fecha:${date_server()}`)
            }
            let [RowDataPacket] = results[0]
            if (RowDataPacket === undefined) {
                console.log(" No existe el id module: ");
                saveLog (`Error , no existe el modulo: ${id_module} , el error es: ${error.message}, fecha:${date_server()}`)
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
                saveLog (`Error al momento de calcular la ultima novedad para el xtam ${fk_xtam} , el error es: ${error.message}, fecha:${date_server()} `)
            }
            if (results.length == 0) {
                console.log("haga el insert");
                let {telemetria,XTAM,ID} = telemetry
                insert_xtam_news(fk_xtam,telemetria,XTAM,ID ) 
                //insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID )
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
                    //insert_xtam_services_news(fk_xtam,telemetria,XTAM,ID )
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
        var  data = []; 
        /*console.log( "  temp ", telemetria.tem, "   hum ", telemetria.hum,  "   Wop5V", telemetria.Wop5V,"  Vop12V ",telemetria.Vop12V
        ,"   Wop12V ", telemetria.Wop12V, " bat ", telemetria.bat, "  red ", telemetria.red, " Rdb ",  telemetria.Rdb, " CUP ", XTAM.CUP
        ,   "  GPU  ", XTAM.GPU , "  RAM  ", XTAM.RAM ,  "     ", " TempCPU ",   XTAM.TempCPU, " TempGPU ", XTAM.TempGPU, "  DiskUse ",   XTAM.DiskUse  );*/

        // validaciones vienen vacios>
        if ( telemetria.tem != UNDEFINNED) 
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
        if ( telemetria.Wop5V > CEROO) 
        {
            //console.log(  "Temperatura indefinida  " ) 
            data.push([fk_xtam, 12, telemetria.Vop5V])
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
        if ( telemetria.Rdb > CEROO) 
        {
            data.push([fk_xtam, 10, telemetria.Rdb])
        } 
        if ( telemetria.GPU > CEROO) 
        {
            data.push([fk_xtam, 25, XTAM.GPU])
        } 
        if ( telemetria.RAM > CEROO) 
        {
            data.push([fk_xtam, 26, XTAM.RAM])
        }
        if ( telemetria.TempCPU > CEROO) 
        {
            data.push([fk_xtam, 27, XTAM.TempCPU])
        }
        if ( telemetria.TempGPU > CEROO) 
        {
            data.push([fk_xtam, 28, XTAM.TempGPU])
        }
        if ( telemetria.DiskUse > CEROO) 
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
    try 
    {
        //insertar valores cualitativos
        //TIP: null  ///que es tip en el json telemetria, preguntar a sebastian
        var query = `INSERT INTO xtamtelemetria.xtam_services_news (Fk_xtam, Fk_categoria, valor) VALUES ?`;
       // data array
        var data = [
           [fk_xtam,  2, XTAM.Services.FTP],
           [fk_xtam,  3, XTAM.Services.APACHE],
           [fk_xtam, 31, XTAM.Services.PingC4],
           [fk_xtam, 32, XTAM.Services.PingRobustel],
           [fk_xtam, 32, XTAM.FlujosIN.INSTC1],
           [fk_xtam, 33, XTAM.FlujosIN.INSTC2],
           [fk_xtam, 34, XTAM.FlujosIN.INSTC3],
           [fk_xtam, 35, XTAM.FlujosIN.INSTC4],
        ];
       
        con.query(query, [data], function(err, response)
        {
            if (err) {
                    saveLog (`Error al momento de insertar la novedad en  xtam_services_news ${data} , el error es: ${err.message}, fecha: ${date_server()}`);
            }else {
                console.log('Registros insertados: ' + response.affectedRows);
            }
        });
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : insert_xtam_services_news, fecha:${date_server()}`);
    }
}

// guaradar en el log
function saveLog ( txtt )
{
    try {
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
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : saveLog, error:${error.message}, fecha:${date_server()}`);
    }
}

function howMinutes () {
    try {
        //tenga en cuenta la ruta del archivo del cual se extraen los minutos
        let archivo = fs.readFileSync('C:/Users/Administrator/Documents/minutes.txt', 'utf-8');
        let whatMinutes = JSON.parse(archivo);
        let minutuess = parseInt(whatMinutes.Minutes) ;
        return  minutuess;
    } catch (error) {
        saveLog (`Exepcion producida en la funcion : howMinutes, error:${error.message}, fecha:${date_server()}`);
    }
}
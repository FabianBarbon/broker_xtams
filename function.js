(async () =>
{
  try
  {
    // calcular el id del xtam
    const calculate_id = await query(`SELECT  id, descripcion, id_modulo FROM  xtamtelemetria.xtams where id_modulo = "${response.ID}" limit 1`);

    if (calculate_id.length >= 1)
    {
        //console.log("Existe el id");
        let { id, descripcion, id_modulo   } = calculate_id [0]
    }
    else
    {
      //HACER QUE GUARDE EN UN TXT
      console.log("No existe el id");
    }

  }catch (error) {
    console.log(error);
  }
})()











/*
  calculate_xtam (response.ID).then(data =>
    {
       console.log(data);
       //Existe el xtam
       if (data.length >=1 )
       {
            let { id, descripcion, id_modulo  } = data[0]
            ultimate_row (id).then(data =>
            {
              // tiene registros con el fk del xtam
              if (data.length >=1 )
              {
                  console.log(  "Data fechas " +  data[0].fecha  );
                  /* PARSEO LA FECHA CON LA LIBRERIA MOMENT   */
                  fecha_format = moment(`${data[0].fecha} ${data[0].hora}`, 'DD/MM/YYYY HH:mm:ss');
                  fecha_server = moment(date_server(), 'DD/MM/YYYY HH:mm:ss');
                  /*  FIN PARSEO LA FECHA CON LA LIBRERIA MOMENT */
                  minutess = fecha_server.diff(fecha_format, 'minutes', true) ;  //difrenecia en minutos
                  console.log("Minutos :" + minutess );


                   const miutes_insert = 30 ;
                  //esmayora 30 minutos ?
                  if ( minutess >= miutes_insert )
                  {
                      console.log("ADENTRO");
                      inserts_news (id,response.temp.toFixed(2))
                  }
              }
              //inserte derecho


            });
       }
       else {
         console.log("No existe el id modulo");
       }
    });
*/

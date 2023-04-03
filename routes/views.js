const express = require('express')

const userModel = require('../models/user')
const fileModel = require('../models/files')
const auth = require('../auth/auth');

const router = express.Router();

console.log("entra validador user")

router.get("/favicon.ico", (req,res)=>{
    res.sendStatus(204) 
  })

router.use(auth.validator,
    
    (err, req, res, next) => {
    if(err.stack.length>0){ // middleware si nos llega un error de validacion mandar al usuario al index, asi evitamos la pantalla fea del error
        console.error(err.message);
        res.render('index.html')
        return
        // next(err)
    }
    next()
  },auth.refreshToken)

router.get('/',async (req,res)=>{

    const ide=auth.decodeIdJWT(req.cookies.token); //uso la funcion y recojo el ID del token
    
    const InfoUser= await userModel.findOne({ _id: ide });
    
    
    let nombresList=[];
    let page=null;
    let filtro=null;
    try {
        //recojo los parametros enviados por metodo get
        let params = new URLSearchParams(req.params);
        console.log("params")
        //si hay filtro lo guardo en una variable
        if(req.query.filtro!==null){
            filtro=req.query.filtro;
        }; // filtro a usar
        
        if (req.query.page!==null){
            page = req.query.page; // pagina actual
        }
        
    } catch (error) {
        console.log("error al parsear")
        console.log(error)
    }

    if(page==null||page<1){
        page=1; // skip (page-1)*5 , asi la pag1 sera skip 0 la 2 sera skip 5 y asi sucesivamente
    }
    
    if(filtro==null){
        filtro=""
    }
    //HE PUESTO DE 5 EN 5 PERO CAMBIANDO LOS VALORES DE LAS DOS LINEAS SIGUIENTES SE PUEDE CAMBIAR 
    //querys para conseguir longitud de paginas
    longitud=Math.ceil(await fileModel.count({_id:{$in:InfoUser.fileS},clientName:{$regex: filtro}})/5) //hacerle count
    // longitud=Math.ceil(archivosTotales.length/5); // con esto calculo longitud de paginas y las redondeo hacia arriba
    if(page>longitud){
        page=longitud;
    }
    //query para recoger los archivos del usuario con el filtro (regex es incluye asi que un filtro de "" devolvera todos los archivos)
    let archivosFinales=(await fileModel.find({_id:{$in:InfoUser.fileS},clientName:{$regex: filtro}}).skip((page-1)*5).limit(5)) 
    
    //recorremos todos los archivos y los añadimos a una array la cual enviaremos en el render
    for(let i=0;i<archivosFinales.length;i++){
        nombresList.push({
            filename:archivosFinales[i]['filename'],
            description:archivosFinales[i]['description'],
            isPrivate:archivosFinales[i]['isPrivate'],
            clientName:archivosFinales[i]['clientName']
        })
    }
    //enviamos toda la informacion necesaria al user.ejs mediante render
    res.render('user.ejs', {
        user: {
            email:InfoUser.email,
            files: nombresList,
            filter: filtro,
            pagina: page,
            maxPage: longitud
        }
    })
})

router.get("/public", async (req,res)=>{
    let nombresList=[];
    let page=null;
    let filtro=null;
    try {
        let params = new URLSearchParams(req.params);
        console.log("params")
        if(req.query.filtro!==null){
            filtro=req.query.filtro;
        }; // filtro a usar
        
        if (req.query.page!==null){
            page = req.query.page; // pagina actual
        }
        
    } catch (error) {
        console.log("error al parsear")
        console.log(error)
    }

    if(page==null||page<1){
        page=1; // skip (page-1)*5 , asi la pag1 sera skip 0 la 2 sera skip 5 y asi sucesivamente
    }
    
    if(filtro==null){
        filtro=""
    }

    //HE PUESTO DE 5 EN 5 PERO CAMBIANDO LOS VALORES DE LAS DOS LINEAS SIGUIENTES SE PUEDE CAMBIAR 
    
    longitud=Math.ceil(await fileModel.count({isPrivate:false,clientName:{$regex: filtro}})/5) //hacerle count
    if(page>longitud){
        page=longitud;
    }
    // longitud=Math.ceil(archivosTotales.length/5); // con esto calculo longitud de paginas y las redondeo hacia arriba
    let archivosFinales=(await fileModel.find({isPrivate:false,clientName:{$regex: filtro}}).skip((page-1)*5).limit(5)) 

    //top 3 , no he conseguido la query directa
    let archivosTotales=(await fileModel.count({isPrivate:false}))
    let users=(await userModel.find())
    let cantidadPublica=0;
    let listaUserPublic=[];
    let sizz=3

    for(let i=0;users.length>i;i++){
        cantidadPublica=(await fileModel.count({isPrivate:false,_id:{$in:users[i]['fileS']}}))
        listaUserPublic.push(
            {
                username: users[i]['email'],
                cantidad:cantidadPublica
            }
        )
    }

    if(listaUserPublic.length<3 && listaUserPublic.length>0){
        sizz=listaUserPublic.length
    }

    if(listaUserPublic.length>0){
        listaUserPublic=(listaUserPublic.sort(function (a, b) { //metodo burbuja
            if (a.cantidad < b.cantidad) {
              return 1;
            }
            if (a.cantidad > b.cantidad) {
              return -1;
            }
            // a must be equal to b
            return 0;
          }))
        
          listaUserPublic=listaUserPublic.slice(0, sizz)
        
    }
    

    let owners;
    //recorremos los archivos publicos, si tienen dueño estos los incluye en la array que pasaremos por render al public.ejs
    for(let i=0;i<archivosFinales.length;i++){
        owners=await userModel.findOne({fileS:{"_id": archivosFinales[i]['_id']}})
        if(owners!=null){
             
                nombresList.push({
                filename:archivosFinales[i]['filename'],
                description:archivosFinales[i]['description'],
                owner:owners['email'],
                clientName:archivosFinales[i]['clientName']
        })
        }
        
    }
    
    res.render('public.ejs', {
        user: {
            files: nombresList,
            filter: filtro,
            pagina: page,
            maxPage: longitud,
            top3:listaUserPublic,
            maxPublic:archivosTotales
        }
    })
})


module.exports=router;
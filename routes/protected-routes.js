const express = require('express')
const auth = require('../auth/auth');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user')
const fileModel = require('../models/files')
const path = require('path');
const fs=require('fs');
const fs2=require('fs').promises;
const multer  = require('multer')

//definimos la configuracion del multer el cual usaremos para guardar archivos subidos
//definimos destino y nombre
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './upload')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname )
    }
  })
   
//creamos el multer con las opciones 
const upload = multer({ storage: storage })

let usuarioFinal="";

const router = express.Router();

//funcion asincrona que nos crea una carpeta de usuario si esta no existe ya
async function estructurar(req,res,next){
    //extraemos el id del usuario
    const ide=auth.decodeIdJWT(req.cookies.token);
    //buscamos el usuario de ese id
    usuarioFinal= await userModel.findOne({ _id: ide });
    //condicional si la carpeta existe
    if(!fs.existsSync("./upload/"+usuarioFinal.email)){
        fs.mkdir("./upload/"+usuarioFinal.email,{ recursive: true }, (err) => {
            if (err) {
                return console.error(err);
            }
            console.log('Directory created successfully!'); // este bloque funciona y es muy util , creacion de carpeta para cada user si no existe ya
        });
    }
    next();
}

router.all((req, res,next) => {console.log("protected routes")
next()})

//middleware que nos valida y nos refresca el JWT SIEMPRE que entremos en este router
router.use(auth.validator,auth.refreshToken) //si se usa este router, validaremos y actualizaremos el jwt
    
//endpoint para subir archivo
router.post('/upload', estructurar,upload.single('archivo'), async (req, res) => {

    console.log("entro en upload");
    //condicional para comprobar que tanto el nombre como el archivo hayan sido enviados y no sean nulos
    if(!req.body.nombre || !req.file){
        res.sendStatus(400);
        res.end();
    }

    //creamos nuevo nombre para el archivo usando la fecha y hora actual (asi no se repetiran los nombres)
    let nombreFinal=Date.now()+"-"+req.file.originalname; 
    //multer estaba configurado para subirlo a la carpeta upload, asi que aprovechando que debemos moverlo le cambiamos el nombre
    const oldpath="./upload/"+req.file.originalname;
    const newpath="./upload/"+usuarioFinal.email+"/"+nombreFinal;
    
    //inicializamos datos, que proximamente vamos a usar
    let datos={}
    console.log(newpath)
    console.log(oldpath)
    //movemos el archivo
    fs2.rename(oldpath,newpath).then(() => {/* Handle success */}).catch((error) => {
        //res.sendStatus(80)
        console.log("error guardado archivo")
    }) //muevo el archivo a su directorio de usuario

    //introducimos el nombre al campo filename de datos
    datos.filename=nombreFinal; //se guarda con la extension
    //si no se ha proporcionado private por el metodo post le asignamos falso
    if(!req.body.private){
        datos.isPrivate=false;
    }
    else{
        //si se ha proporcionado comprobamos el valor y le damos el correcto , ya que se envia de tipo string y debe ser boolean
        if (req.body.private=="false"){
            datos.isPrivate=false;
        }
        else{
            datos.isPrivate=true;
        }
    }
    //si no se proporciona descripcion , no haremos nada, en cambio si hay una se la asignaremos a datos
    if(!req.body.descripcion){
        console.log("sin descripcion")
    }
    else{
        datos.description=req.body.descripcion;
    }
    console.log(req.file)
    //introducimos a datos el nombre que vera el usuario (clientName)
    datos.clientName=req.body.nombre;
    //creamos un fileModel con los datos
    let archivo = new fileModel(datos);
    //guardamos el fileModel, si todo es correcto guardamos el archivo en el fileS del usuario
    await archivo.save(async function(err) {
        usuarioFinal.fileS.push(archivo);
        await usuarioFinal.save(function(err) {
        });
    });
           
    console.log("archivo creado, salgo de upload")
    res.status(204)
    res.end("Archivo creado en la ruta: ./upload/"+usuarioFinal.email);
}
);

//endpoint de descargar
router.get("/download", async (req,res)=>{
    console.log("download:")
    console.log(req.query.user)
    console.log(req.query.file)
    //comprobamos que tanto el archivo como el usuario se han pedido por metodo get no esten vacios
    if(!req.query.file || !req.query.user){
        res.sendStatus(404);
    }
    //desencriptamos el jwt y obtenemos el usuario del mismo
    let fil =await fileModel.findOne({ filename: req.query.file });
    if(fil.isPrivate==true){
        const ide=auth.decodeIdJWT(req.cookies.token);
        usuarioFinal= await userModel.findOne({ _id: ide });
        //si el usuario actual y el enviado por metodo get no es el mismo cortaremos ejecucion y enviamos un error de no autorizado
        if(usuarioFinal.email!=req.query.user){
            res.sendStatus(401);
        }
    }
    
    //si el archivo no existe enviaremos un 404 no encontrado
    if(!fs.existsSync("./upload/"+req.query.user+"/"+req.query.file)){
        res.sendStatus(404);
    }
    //si todo va bien descargaremos el archivo (ultimo parametro es el nombre que se dara al archivo)
    let cnombre= await fileModel.findOne({filename: req.query.file}); // ERROR DE FORMATO hay que añadirlo con path.extname
    
    res.download('./upload/'+req.query.user+"/"+req.query.file,cnombre.clientName+path.extname("./upload/"+req.query.user+"/"+req.query.file));
})

//middleware para confirmar si el archivo a editar o borrar es de propiedad del usuario actual

let objetivo
let ide

router.use(async (req,res,next)=>{
    ide=auth.decodeIdJWT(req.cookies.token);
    //buscamos el archivo a eliminar 
    objetivo= await fileModel.findOne({filename: req.body.filename});
    usuarioFinal= await userModel.findOne({ _id: ide ,fileS:objetivo._id})
    
    if(!usuarioFinal){
        const error = new Error('El archivo no existe en el usuario actual')
        error.status = 400
        return next(error)
    }
    next()
})
//endpoint de borrado
router.post("/delete",async (req,res)=>{
   
    try {
        //eliminamos el archivo de la array del usuario (base de datos)
        await userModel.findOneAndUpdate({ _id: ide},
            {$pull: { fileS: objetivo._id  }})
            //eliminamos el archivo de la base de datos
            objetivo.delete()
        //borramos el archivo local
        fs.unlinkSync("./upload/"+usuarioFinal.email+"/"+req.body.filename);
    } catch (error) {
        //si algo sale mal por ejemplo que el archivo no exista; cortamos y devolvemos error
        console.log(error)
        res.sendStatus(404)
    }
    
    res.sendStatus(201);
})

//endpoint de actualizar
router.post("/update",async (req,res)=>{ 

    //condicional si el nombre no es nulo, si no lo es actualizamos el clientName con ese nombre
    if(typeof req.body.nombre !== 'undefined' && (req.body.nombre).length>0){
        await fileModel.updateOne({filename:req.body.filename}, { clientName: req.body.nombre })
        console.log("nombre editado")
    }

    if(typeof req.body.descripcion !== 'undefined' && (req.body.descripcion).length>0){
        await fileModel.updateOne({filename:req.body.filename}, { description: req.body.descripcion })
        console.log("desc editado")
    }

    await fileModel.updateOne({filename:req.body.filename}, { isPrivate: req.body.private }).then(() => res.sendStatus(201)).catch((err) => {
        res.sendStatus(401)
      })

})
        
module.exports=router;
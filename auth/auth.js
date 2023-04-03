const userModel = require('../models/user')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
const argon2= require('argon2');

//Funcion para registrarse, debido a que debemos buscar en la base de datos, es asincrona
async function register(req, res, next) {

    //recogemos los datos que nos pasan mediante el metodo post y se envian por el body, asi es mas comodo de gestionar los datos
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    //condicional si los valores no son nulos, en tal caso cortara ejecucion y devolvera un error
    if (!user.email || !user.password) {
        const error = new Error('mail y/o contraseña vacias')
        error.status = 400
        return next(error)
    }

    //realizamos una busqueda en la base de datos para ver si existe el usuario enviado por el POST y lo guardamos en una variable
    const exists = await userModel.findOne({ email: user.email })

    //en caso que el usuario ya exista (email es unico) devolveremos un error y cortaremos ejecucion
    if (exists) {
        const error = new Error('El usuario ya existe')
        error.status = 401 //error de inicio de sesión
        return next(error)
    }

    //en caso de que ningun condicional haya cortado la ejecucion (significa que todo ha ido bien) , crearemos un usuario en la base de datos con los datos obtenidos por metodo POST
    // para crearlo usamos el modelo de mongoose que hemos creado con anterioridad 
    await userModel.create({ email: user.email, password: user.password })
    next()
}

//Funcion para loguearse, debido a que debemos buscar en la base de datos, es asincrona
async function login(req, res, next) {
    console.log("logeando")

    //recogemos los datos que nos pasan mediante el metodo post y se envian por el body, asi es mas comodo de gestionar los datos
    const user = {
        email: req.body.email,
        password: req.body.password
    }

     //condicional si los valores no son nulos, en tal caso cortara ejecucion y devolvera un error
    if (!user.email || !user.password) {
        const error = new Error('mail y/o contraseña vacias')
        error.status = 400
        return next(error)
    }

    //realizamos una busqueda en la base de datos para ver si existe el usuario enviado por el POST y lo guardamos en una variable
    const exists = await userModel.findOne({ email: user.email })

    //en caso que el usuario no exista devolveremos un error y cortaremos ejecucion
    if (!exists) {
        const error = new Error('usuario no existe!')
        error.status = 401
        return next(error)
    }

    //procedemos con la comprobacion de la contraseña usando la contraseña encriptada que tenemos guardada en la base de datos y la contraseña introducida por metodo POST 
    if (await argon2.verify(exists.password, req.body.password)) {
        // password match
        console.log("credenciales correctas")
      } else {
        // password did not match cortamos ejecucion y devolvemos error
        const error = new Error('credenciales incorrectas')

        error.status = 401
        return next(error)
      
    } 

    //si todo ha ido bien procedemos a crear un Json Web Token (JWT) con la id de nuestro usuario que expirara em 1 hora y la clave secreta es "secreto-de-test"
    let token= jwt.sign({
        id: exists._id
    },'secreto-de-test',{ expiresIn: '1h' });

    //creamos una Cookie la cual contendra nuesto JWT , sera solo para Http y su path sera para el / y sus "hijos"
    res.setHeader('Set-Cookie', 'token='+token+'; HttpOnly;path=/');
    //devolvemos un estatus de resolucion correcta pero sin contenido
    res.status(204)
    next()
}

//Funcion para validar el JWT
function validator(req, res, next){
    try {
        console.log('validador:')
        // comprobamos que el JWT del cookie es correcto y/o esta caducado, si esta caducado o es incorrecto o no existe devolvemos error y cortamos ejecucion
        jwt.verify(req.cookies.token,'secreto-de-test')
    } catch(error) {
        console.log('error validador cookie jwt')
        //codigo de error de sin autorizacion
        error.status = 401
        return next(error)
    }
    next()
}

//funcion que nos renovara el JWT 
function refreshToken(req,res,next){
    
    //recogemos en una variable un nuevo JWT usando el id desencriptado (usando la funcion que adelante se comenta) del actual JWT 
    let nuevo=jwt.sign({
        id: decodeIdJWT(req.cookies.token)
    },'secreto-de-test',{ expiresIn: '1h' });
    
    // volvemos a guardarlo en el cookie
    res.setHeader('Set-Cookie', 'token='+nuevo+'; HttpOnly;path=/');

    console.log("token actualizado")
    
    next(); 
}

//Funcion la cual le enviamos un token y nos devuelve el id desencriptado
function decodeIdJWT(tokken){
    const decodedToken = jwt.decode(tokken, {
        complete: true
       });
    return decodedToken.payload["id"]; //Funcion para devolver el id guardado en el token que le pasamos
}

module.exports = { login, register,validator,refreshToken,decodeIdJWT }
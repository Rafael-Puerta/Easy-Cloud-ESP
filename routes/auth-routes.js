const express = require('express')

const auth = require('../auth/auth')
const protected=require('./protected-routes')

const router = express.Router();

//middleware para seguimiento de acceso
router.use((req,res,next)=>{
    console.log('entro auth routes')
    next()
})

//endpoint el cual accedemos si entramos en /login con el metodo post el cual 
//ejecuta la funcion middleware login del archivo auth, si no corta la ejecucion y no hay errores devolvemos un status 204
router.post('/login',  auth.login, (req, res) => {
  res.sendStatus(204)
})

//endpoint el cual accedemos si entramos en /register con el metodo post el cual 
//ejecuta la funcion middleware register del archivo auth, si no corta la ejecucion y no hay errores devolvemos un status 204
router.post('/register', auth.register,  (req, res) => {
  res.sendStatus(204)
})

//exportamos el router para usarlo en otros archivos
module.exports=router;
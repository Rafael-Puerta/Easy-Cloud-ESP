const express = require('express')


const router = express.Router();

//endpoint de /login nos muestra el html de login
router.get('/login',(req,res)=>{
    res.render('login');
})

//endpoint de register nos muestra el html de register
router.get('/register',(req,res)=>{
    res.render('register');
})

module.exports=router;
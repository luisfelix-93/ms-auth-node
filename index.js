const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const {Client} = require('@microsoft/microsoft-graph-client');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const { BearerStrategy } = require('passport-azure-ad');
const fetch = require('node-fetch');
const axios = require('axios');

// Configuração do de autenticação OAuth 2.0

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const tenantID = process.env.TENANT_ID;
const redirectURI = process.env.REDIRECT_URI;
const scopes = ['https://graph.microsoft.com/mail.send'];
const username = process.env.DE_LOGIN;
const password = process.env.DE_PASSWORD;
const accessToken = process.env.ACCESS_TOKEN
// Configuração do servidor express

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());

// Configuração da estratégia de autenticação

// passport.use(new BearerStrategy({
//     identityMetadata: `https://login.microsoftonline.com/${tenantID}/.wellknown/openid-configuration`,
//     clientID: clientID,
//     audience: 'https://graph.microsoft.com',
//     scope: scopes
// }, (accessToken, done) => {
//     done(null, accessToken);
// }));

passport.use(new OAuth2Strategy({
    authorizationURL:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenURL:'https://login.microsoft.com/common/oauth2/v2.0/token',
    clientID: clientID,
    clientSecret: clientSecret,
    callbackURL: redirectURI, 
    scope: ['openId', 'profile']
}, function(accessToken, refreshToken, profile, done) {
    const graph = require('@microsoft/microsoft-graph-client')
    const client = graph.Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
    client.api('me/messages').get((err, res) =>{
        if(err){
            done(err);
        }else{
            done(null, res.value);
        }
    })
}))
// Rota para pegar o token:

app.get('/api/get-token', async (req, res) => {
    const urlToken = `https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`;
    const bodyPost = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': `${clientID}`,
        'client_secret': `${clientSecret}`,
        'scope': 'https://graph.microsoft.com/.default'
        // 'username': `${username}`,
        // 'password': `${password}`
    }); 
    const options = {
        method: 'POST',
        headers: {'Content-type':'application/x-www-form-urlencoded;charset=UTF-8'},
        body: bodyPost
    }
    try{
        const response = await fetch(urlToken, options)
        const json = await response.json();
        res.status(200).json(json);
    } catch(error){
        console.log(error);
        res.status(500).send('Erro ao obter o token de acesso')
    }
})


app.get('/api/get-connection', async (req, res) =>{
    const urlConnection = `https://graph.microsoft.com/v1.0/users`;
    const bodyPost = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': `${clientID}`,
        'client_secret': `${clientSecret}`,
        'scope': 'https://graph.microsoft.com/.default'
    });
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-type':'application/x-www-form-urlencoded;charset=UTF-8'
        },
         body: bodyPost
    }
    try{
        const response = await fetch(urlConnection, options)
        const json = await response.json();
        res.status(200).json(json);        
    }catch (error){
        console.log(error);
        res.status(500).send('Erro ao conectar ao usuário' + error);
    }
})


// Rota para enviar e-mail;
// app.post('/api/send-email', passport.authenticate('BearerToken', {session: true}), async (req, res) => {
//     try{
//         const accessToken = req.user;
//         const client = Client.init({
//             authProvider: (done) =>{
//                 done(null, accessToken);
//             }
//         });

//         const message = {
//             subject: req.body.subject,
//             toRecipients: [
//                 {
//                     emailAdress: {
//                         address:req.body.to
//                     }
//                 }
//             ],
//             body: {
//                 content: req.body.body,
//                 contentType: 'html'
//             }
//         };

//         await client.api('/me/sendMail').post({message: message});
//         res.status(200).json({message: 'Email enviado com sucesso.'});
//     } catch(error) {
//         console.log(error);
//         res.status(500).json({message: 'Ocorreu um erro ao enviar o e-mail'});
//     }
// });

// app.get('/api/get-emails', passport.authenticate('BearerToken', {session: false}), async (req, res) => {
//     try{
//         const accessToken = req.user;
//         const client = Client.init({
//             authProvider: (done) => {
//                 done(null, accessToken);
//             }
//         });
//         const message = await client.api('/me/message').select('subject,from,createdDateTime').top(10).get();
//         res.status(200).json(messages);
//     } catch(error){
//         console.log(error);
//         res.status(500).json({message: 'Ocorreu um erro ao receber os emails'})
//     }
// });
app.listen(3000, () => {
    console.log('Servidor iniciado na porta 3000.');
});
const fetch = require("node-fetch");
const querystring = require('querystring');    
const express = require('express')
const session = require('express-session')
const app = express()
const port = 3000

app.use(session({
  secret: '__secret__',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))


const productCode = 'ENP'
const clientId = '........'
const clientSecret = '........'
const siteBase = `http://localhost:${port}`

/*  PROD 
const urlBase = 'https://connectid.se/user/'
const apiBase = 'https://api.mediaconnect.no/capi/'
*/

/*  TEST 
*/
const urlBase = 'https://api-test.mediaconnect.no/login'
const apiBase = 'https://api-test.mediaconnect.no/capi'

const tokenUrl = `${urlBase}/oauth/token`
const authorizeUrl = `${urlBase}/oauth/authorize`
const logoutUrl = `${urlBase}/logout`
const registerUrl = `${urlBase}/register`

const profileUrl = `${apiBase}/v1/customer/profile`
const accessUrl = `${apiBase}/v1/customer/access`

app.get('/', (req, res) => {
    const { user = {} } = req.session
    res.send(`
        <html>
            <body>
            <a href="/login">Login</a>
            <a href="/logout">Logout</a>
            <a href="/register">Register</a>
            <hr/>
            <pre>${JSON.stringify(user, null, 4)}</pre>
            </body>
        </html>
    `)
})

app.get('/login', (req, res) => {
    req.session.destroy();
    const query = querystring.stringify({
        client_id: clientId,
        state: 'some_random_state',
        response_type: 'code',
        scope: 'read',
        redirect_uri: `${siteBase}/callback`,
    })
    res.redirect(authorizeUrl + '?' + query)
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    const query = querystring.stringify({
        clientId,
        returnUrl: `${siteBase}/`,
        errorUrl: `${siteBase}/error`,
    })
    res.redirect(logoutUrl + '?' + query)
})

app.get('/register', (req, res) => {
    req.session.destroy();
    const query = querystring.stringify({
        clientId,
        returnUrl: `${siteBase}/login`,
        errorUrl: `${siteBase}/error`,
    })
    res.redirect(registerUrl + '?' + query)
})

app.get('/callback', async (req, res) => {

    const { code, state } = req.query
    const body = {
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${siteBase}/callback`,
        grant_type: 'authorization_code'
    }

    try {
        // Get access token from the authorization code
        const tokenResp = await fetch(tokenUrl, {
            method: 'post',
            body:    querystring.stringify(body),
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
        })
        const {access_token, refresh_token, expires_in} = await tokenResp.json();

        // Get users profile data
        const profileResp = await fetch(profileUrl, {
            headers: { 
                'Authorization': `Bearer ${access_token}`,
                'Accept': 'application/json'
            },
        })
        const profile = await profileResp.json();

        // Get users access to the specific subscription product
        const accessResp = await fetch(accessUrl, {
            method: 'post',
            body: JSON.stringify({
                product: productCode
            }),
            headers: { 
                'Authorization': `Bearer ${access_token}`,
                'Accept': 'application/json',
                'Content-type': 'application/json'
            },
        })
        const access = await accessResp.json();
        req.session.user = {profile, access}

        res.redirect('/')

    } catch (error) {
        console.log(error);
        res.send('Callback error!')
    }
})

app.get('/error', (req, res) => {
    res.send('Hello Error!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

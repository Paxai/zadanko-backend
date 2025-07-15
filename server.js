require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Endpoint do logowania przez Discord
app.get('/auth/discord', (req, res) => {
    const redirect_uri = process.env.REDIRECT_URI;
    const authorizeUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=identify%20email`;
    res.redirect(authorizeUrl);
});

// Callback
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Brak kodu autoryzacyjnego.');

    try {
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT_URI,
                scope: 'identify email'
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResponse.data;
        res.send(`<h1>Witaj ${user.username}#${user.discriminator}</h1><p>Email: ${user.email || 'brak emaila'}</p>`);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send('Błąd podczas logowania przez Discord.');
    }
});

app.get('/', (req, res) => {
    res.send(`<h1>Serwer działa. <a href="/auth/discord">Zaloguj przez Discord</a></h1>`);
});

app.listen(PORT, () => {
    console.log(`Server działa na porcie ${PORT}`);
});

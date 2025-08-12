require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const GUILD_ID = '1404816777841741894'; // Twój serwer

// Endpoint do logowania przez Discord
app.get('/auth/discord', (req, res) => {
    const redirect_uri = process.env.REDIRECT_URI;
    // Dodajemy scope "guilds"
    const authorizeUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=identify%20email%20guilds`;
    res.redirect(authorizeUrl);
});

// Callback
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Brak kodu autoryzacyjnego.');

    try {
        // Wymiana code na token
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT_URI,
                scope: 'identify email guilds'
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenResponse.data;

        // Dane użytkownika
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResponse.data;

        // Lista serwerów użytkownika
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const guilds = guildsResponse.data;

        // Sprawdzenie czy jest na danym serwerze
        const isMember = guilds.some(g => g.id === GUILD_ID);

        if (!isMember) {
            return res.status(403).send('<h1>Brak dostępu</h1><p>Nie jesteś członkiem wymaganego serwera Discord.</p>');
        }

        // Jeśli jest członkiem
        res.send(`<h1>Witaj ${user.username}#${user.discriminator}</h1><p>Email: ${user.email || 'brak emaila'}</p><p>✅ Jesteś na wymaganym serwerze!</p>`);
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

const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();

const spotifyApi = new SpotifyWebApi({
    clientId: '2ca1a6b5449c416e938417ae6517ec98',
    clientSecret: '6c5a72d9e55345dca80a0e63acebc7cc',
    redirectUri: 'https://ended-spinner-unlivable.ngrok-free.dev/callback'
});

spotifyApi.setAccessToken('BQB1k4V8tDt-dVirXxjWHtUUdQQTVuZMlzo7_sr_yunHTrUKofHcbYWi1FCbNSX0vCMco97CXg-2qqlvQaUXCheQaegf_6vafXjxaYRHrR4013u4JG1QmlczwTtAffax65qMtXTxYsCiDlRzm31N5nBPha3Mjx-70XCpXMeBAyA_VVWLlOy4QbX59jujUtOKDXS1fC2L17MRYmmkGptrNnBQFDut45zuX4aACS9523dLUvGawF4R1aoEo2Sy');
spotifyApi.setRefreshToken('AQAZ27wjZmNaMgqkx0b2-KGzQFasClwsaJD-XsFW3kc0G-DHruebJptjZYYx2eqjib1HR85CKW2PkDLW60PXDPWE1NOZivKVD3_eX2_DA8pj8cejIS1ECGpVM7DSnti6jJ4');

// 🔁 Refresh automático a cada 50 minutos (token dura 60min)
setInterval(async () => {
    try {
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body.access_token);
        console.log('Token renovado com sucesso');
    } catch (err) {
        console.error('Erro ao renovar token:', err);
    }
}, 50 * 60 * 1000);

// 🔊 Rota que o ESP8266 vai chamar
app.get('/volume', async (req, res) => {
    const v = parseInt(req.query.v);

    if (isNaN(v) || v < 0 || v > 100) {
        return res.status(400).send('Volume inválido');
    }

    try {
        await spotifyApi.setVolume(v);
        console.log(`Volume alterado para ${v}%`);
        res.send('OK');
    } catch (err) {
        // Token expirado? Tenta renovar e repetir
        if (err.statusCode === 401) {
            try {
                const data = await spotifyApi.refreshAccessToken();
                spotifyApi.setAccessToken(data.body.access_token);
                await spotifyApi.setVolume(v);
                res.send('OK');
            } catch (e) {
                console.error('Erro após refresh:', e);
                res.status(500).send('Erro');
            }
        } else {
            console.error('Erro ao setar volume:', err);
            res.status(500).send('Erro');
        }
    }
});

// Rota de autenticação OAuth
const scopes = ['user-modify-playback-state', 'user-read-playback-state'];

app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
    try {
        const data = await spotifyApi.authorizationCodeGrant(req.query.code);
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);
        console.log('Access Token:', data.body.access_token);
        console.log('Refresh Token:', data.body.refresh_token);
        res.send('Autorização concluída! Pode fechar esta aba.');
    } catch (err) {
        console.error(err);
        res.send('Erro na autenticação.');
    }
});

app.listen(5000, '0.0.0.0', () => {
    console.log('Servidor rodando na porta 5000');
    console.log('Para autenticar, acesse: http://localhost:5000/login');
});
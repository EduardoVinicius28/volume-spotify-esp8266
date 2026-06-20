require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: 'https://ended-spinner-unlivable.ngrok-free.dev/callback'
});

spotifyApi.setAccessToken(process.env.ACCESS_TOKEN);
spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);

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
app.get('/play', async (req, res) => {
  try {
    const state = await spotifyApi.getMyCurrentPlaybackState();
    if (state.body?.is_playing) {
      await spotifyApi.pause();
      console.log('Musica Pausada')
    } else {
      await spotifyApi.play();
      console.log('Musica Despausada')
    }
    res.send('OK');
  } catch (err) {
    console.error('Erro play/pause:', err);
    res.status(500).send('Erro');
  }
});

app.get('/next', async (req, res) => {
  try {
    await spotifyApi.skipToNext();
    res.send('OK');
    console.log('Avançar')
  } catch (err) {
    console.error('Erro next:', err);
    res.status(500).send('Erro');
  }
});

app.get('/prev', async (req, res) => {
  try {
    await spotifyApi.skipToPrevious();
    console.log('Voltar')
    res.send('OK');
  } catch (err) {
    console.error('Erro prev:', err);
    res.status(500).send('Erro');
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
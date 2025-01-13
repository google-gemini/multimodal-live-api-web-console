// server.js

import express from 'express';
import path from 'path';
import fetch from 'node-fetch'; // if Node < 18
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Load your private key and client ID
const privateKey = fs.readFileSync('privatekey.pem', 'utf8');
const CLIENT_ID = '2986f339-24c6-45fa-bcf6-810dfee98399';

const app = express();
const PORT = process.env.PORT || 8080;

// 1) Serve the React build
app.use(express.static(path.join(__dirname, 'build')));

// 2) Simple CORS for /getToken if needed
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// 3) Token endpoint
app.get('/getToken', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: CLIENT_ID,
      sub: CLIENT_ID,
      aud: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
      jti: uuidv4(),
      iat: now,
      exp: now + 300,
    };

    const signedJWT = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    const response = await fetch('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: signedJWT
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("Error in /getToken:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 4) For any other request that is not /getToken, serve index.html from build
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`✅ Listening on port ${PORT}`);
});

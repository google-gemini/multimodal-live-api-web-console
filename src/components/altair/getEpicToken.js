import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { getToken } from './getEpicToken'; // Check this path

export async function getEpicToken(privateKey) {
  // Use your Non-Production Client ID from Epic
  const CLIENT_ID = '2986f339-24c6-45fa-bcf6-810dfee98399';

  // Build JWT
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: CLIENT_ID,
    sub: CLIENT_ID,
    aud: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    jti: 'uniq-abc-123',
    iat: now,
    exp: now + 300, // 5 minutes
  };

  const signedJWT = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  // Use the getToken function to retrieve the token
  const token = await getToken(); // Get the token dynamically

  // POST to Epic token endpoint
  const response = await fetch('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${token}` // Use the retrieved token
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: signedJWT
    })
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;  // return just the token
}

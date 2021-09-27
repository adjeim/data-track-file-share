require('dotenv').config();
const express = require('express');
const app = express();
const port = 5000;
const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html');
});

app.post('/token', async (req, res) => {
  if (!req.body.identity || !req.body.room) {
    return res.status(400);
  }

  // Get the user's identity and the room name from the request
  const identity  = req.body.identity;
  const roomName  = req.body.room;

  try {
    // Create a video grant for this specific room
    const videoGrant = new VideoGrant({
      room: roomName,
    });

    // Create an access token
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
    );

    // Add the video grant and the user's identity to the token
    token.addGrant(videoGrant);
    token.identity = identity;

    // Serialize the token to a JWT and return it to the client side
    return res.send({
      token: token.toJwt()
    });

  } catch (error) {
    return res.status(400).send({error});
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
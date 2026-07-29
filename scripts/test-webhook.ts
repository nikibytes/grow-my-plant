import crypto from 'crypto';

const secret = "5ff3d9187815dca28b42aabe5f285a4a"; // from .env
const targetUrl = 'https://duffel-boxing-taking.ngrok-free.dev/api/instagram/webhook';

const uid = Date.now();
const payload = JSON.stringify({
  object: "instagram",
  entry: [
    {
      id: "17841400000000",
      time: Math.floor(uid / 1000),
      changes: [
        {
          field: "comments",
          value: {
            from: { id: `test_user_${uid}`, username: `test_user_${uid}` },
            media: { id: "18075477386235259", media_product_type: "REEL" },
            id: `test_comment_${uid}`,
            text: "🌱 This is a test comment"
          }
        }
      ]
    }
  ]
});

// Generate the hash from the exact string we are about to send
const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log(`Sending payload...`);
console.log(`Signature: sha256=${hash}`);

fetch(targetUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Hub-Signature-256': `sha256=${hash}`,
  },
  body: payload
})
  .then(res => res.text().then(text => console.log(`Response: ${res.status} ${text}`)))
  .catch(err => console.error(err));

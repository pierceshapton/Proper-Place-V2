const axios = require('axios');
const fs = require('fs');

const prompt = process.argv[2] || process.env.PROMPT;
const outPath = process.argv[3] || 'sd-output.png';
const apiUrl = process.env.SD_API_URL || 'http://127.0.0.1:7860/sdapi/v1/txt2img';

if (!prompt) {
  console.error('Usage: node generate.js "<prompt>" [output.png]');
  process.exit(1);
}

const payload = {
  prompt,
  steps: 20,
  width: 512,
  height: 512,
  cfg_scale: 7.0,
  sampler_index: 'Euler a',
  n_iter: 1,
  batch_size: 1
};

(async () => {
  try {
    console.log('Sending request to', apiUrl);
    const res = await axios.post(apiUrl, payload, { timeout: 120000 });
    if (!res.data || !res.data.images || !res.data.images.length) {
      console.error('No images returned from API');
      process.exit(1);
    }
    const b64 = res.data.images[0];
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(outPath, buf);
    console.log('Saved image to', outPath);
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(1);
  }
})();

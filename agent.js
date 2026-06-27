import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Connect to Groq using the key stored in GitHub Secrets
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function runPipeline() {
  console.log('=== PHASE 1: MARKET RESEARCH ===');
  let researchPayload = '';

  try {
    // Scrape latest property news headlines
    const response = await axios.get('https://capitallifters.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);
    const headline = $('h1').first().text().trim()
      || 'Singapore Property Market Update';
    researchPayload = `Latest headline from Capital Lifters: ${headline}.`,
      + ' Market shows continued interest from upgraders and investors.';
    console.log('Research complete.');
  } catch (error) {
    console.log('Using fallback data:', error.message);
    researchPayload = 'Fallback: Singapore Core Central Region (CCR) transaction'
      + ' volumes remain elevated. New launch sales continue to attract'
      + ' strong interest from both locals and foreign investors.';
  }

  console.log('=== PHASE 2: WRITING WITH GROQ AI ===');
  const brandGuidelines = fs.readFileSync(
    path.join('config', 'myrules.md'), 'utf8'
  );

  const compositionPrompt = `
    You are an expert real estate content writer.
    This week's Singapore property market data: ${researchPayload}
    Writing guidelines to follow strictly: ${brandGuidelines}
    Write a complete blog article in clean Markdown format.
    Start directly with the article title as a Markdown heading.
  `;

  const completion = await groq.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [{ role: 'user', content: compositionPrompt }],
  });

  const article = completion.choices[0].message.content;
  console.log('Article writing complete.');

  console.log('=== PHASE 3: SAVE ARTICLE ===');
  const outputDir = './published_posts';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const filename = `market-update-${Date.now()}.md`;
  fs.writeFileSync(path.join(outputDir, filename), article);
  console.log(`Article saved: ${filename}`);
}

runPipeline().catch(console.error);

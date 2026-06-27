import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Handle __dirname configuration for modern ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, 'blogs.json');

async function runPipeline() {
  console.log('=== PHASE 1: MARKET RESEARCH ===');
  let researchPayload = '';

  try {
    const response = await axios.get('https://capitallifters.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);
    const headline = $('h1').first().text().trim() || 'Singapore Property Market Update';
    researchPayload = `Latest headline from Capital Lifters: ${headline}. Market shows continued interest from upgraders and investors.`;
    console.log('Research complete.');
  } catch (error) {
    console.log('Using fallback data:', error.message);
    researchPayload = 'Fallback: Singapore Core Central Region (CCR) transaction volumes remain elevated. New launch sales continue to attract strong interest from both locals and foreign investors.';
  }

  console.log('=== PHASE 2: WRITING WITH GROQ AI ===');
  
  // Dynamic guidelines loading fallback
  let brandGuidelines = 'Write as an expert real estate content strategist focusing on high-converting real estate insights.';
  const rulesPath = path.join(__dirname, 'config', 'myrules.md');
  if (fs.existsSync(rulesPath)) {
    brandGuidelines = fs.readFileSync(rulesPath, 'utf8');
  }

  const compositionPrompt = `
    You are an elite real estate content strategist acting as a partner for a Singapore-based realtor ("Real estate Enthusiast").
    This week's Singapore property market data: ${researchPayload}
    Writing guidelines to follow strictly: ${brandGuidelines}
    
    Provide your output STRICTLY in the following JSON format. Do not include markdown code block formatting (like \`\`\`json) or any conversational text. Output raw JSON only:
    {
      "title": "An engaging, professional article title",
      "excerpt": "A short, catchy 2-sentence summary description of the article for the home page feed.",
      "content": "The full blog article text written in clean Markdown format with structured sections. Use ## for major headings and ### for sub-headings."
    }
  `;

  // Upgraded to active model to completely prevent decommissioned 400 errors
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: compositionPrompt }],
    response_format: { type: "json_object" }
  });

  const generatedData = JSON.parse(completion.choices[0].message.content);
  console.log('Article writing complete.');

  console.log('=== PHASE 3: UPDATE DATABASE MATRIX ===');
  let blogDatabase = [];

  if (fs.existsSync(databasePath)) {
    try {
      blogDatabase = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    } catch (e) {
      blogDatabase = [];
    }
  }

  // Time Zone Fix: Forces date generation to lock onto Singapore time regardless of server/user location
  const sgOptions = { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric' };
  const sgDateString = new Intl.DateTimeFormat('en-SG', sgOptions).format(new Date());
  
  const articleId = String(Date.now());

  const newPostEntry = {
    id: articleId,
    date: sgDateString,
    category: "Market Update",
    title: generatedData.title,
    excerpt: generatedData.excerpt,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    content: generatedData.content
  };

  blogDatabase.unshift(newPostEntry); // Newest article always at the top
  fs.writeFileSync(databasePath, JSON.stringify(blogDatabase, null, 2));
  console.log(`Database successfully updated with article ID: ${articleId}`);
}

runPipeline().catch(console.error);

const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const blogsJsonPath = path.join(__dirname, 'blogs.json');

/**
 * Phase 1: Market Research Ingestion
 */
function getMarketResearchData() {
    console.log("=== PHASE 1: MARKET RESEARCH ===");
    try {
        const rawScrapedDataPath = path.join(__dirname, 'scraped_properties.json');
        if (fs.existsSync(rawScrapedDataPath)) {
            console.log("Found raw scraped property portal data. Parsing insights...");
            return JSON.parse(fs.readFileSync(rawScrapedDataPath, 'utf8'));
        }
    } catch (e) {
        console.warn("Utilizing systemic market backups.");
    }
    
    return {
        location: "Singapore",
        trends: ["New project launches driving momentum", "Increased demand for modern executive condominiums"],
        focus: "Real Estate Enthusiast & Investor Portfolios"
    };
}

/**
 * Phase 2 & 3: Content Generation & Database Ledger Updates
 */
async function runPipeline() {
    const research = getMarketResearchData();
    
    console.log("=== PHASE 2: WRITING WITH GROQ AI ===");
    const prompt = `You are an elite real estate content strategist acting as a partner for a Singapore-based realtor ("Real estate Enthusiast").
    Based on these insights: ${JSON.stringify(research)}, write an engaging, high-converting real estate blog post.
    Provide the output strictly in the following JSON format:
    {
        "title": "Catchy Blog Post Title",
        "category": "Market Update",
        "excerpt": "A short, engaging 1-2 sentence preview for the home page list.",
        "content": "Use Markdown formatting for the content body. Use ## for major headings and ### for sub-headings. Separate paragraphs with double newlines."
    }`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You output nothing but raw, valid JSON matching the requested structure." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(chatCompletion.choices[0].message.content);
        console.log(`Writing article content to ledger: ${result.title}`);

        // Read or initialize the central blogs.json ledger array safely
        let blogsLedger = [];
        if (fs.existsSync(blogsJsonPath)) {
            try {
                blogsLedger = JSON.parse(fs.readFileSync(blogsJsonPath, 'utf8'));
            } catch (e) {
                blogsLedger = [];
            }
        }

        // Build the clean post object matching your frontend criteria
        const newEntry = {
            id: Date.now(), // Unique ID for index.html routing parameters
            title: result.title,
            category: result.category || "Market Update",
            excerpt: result.excerpt,
            image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
            content: result.content,
            date: new Date().toLocaleDateString('en-SG', { 
                timeZone: 'Asia/Singapore',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            })
        };

        // Insert new post at the top of the timeline
        blogsLedger.unshift(newEntry);
        fs.writeFileSync(blogsJsonPath, JSON.stringify(blogsLedger, null, 2), 'utf8');
        console.log("=== PHASE 3: PUBLIC INDEX LEDGER UPDATED CLEANLY ===");

    } catch (error) {
        console.error("Pipeline failure executed during processing:", error);
        process.exit(1);
    }
}

runPipeline();

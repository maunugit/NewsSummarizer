const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

router.post('/', async (req, res) => {
    console.log('Received request for summarization:', req.body);
    
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            console.log('Missing title or content');
            return res.status(400).json({ error: 'Missing title or content' });
        }

        console.log('Calling OpenAI API...');
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional news analyst. Create detailed, informative summaries of news articles that capture the key points, context, and implications. Include relevant details while maintaining clarity."
                },
                {
                    role: "user",
                    content: `Please provide a comprehensive summary of this news article in 4-5 sentences. Include the main event, key details, context, and any significant implications or developments:\n\nTitle: ${title}\n\nContent: ${content}`
                }
            ],
            max_tokens: 250,
            temperature: 0.7,
        });

        console.log('OpenAI response received:', completion.choices[0].message);
        const summary = completion.choices[0].message.content;
        
        // Make sure we're sending proper JSON
        res.json({ summary: summary });
        
    } catch (error) {
        console.error('Server-side error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
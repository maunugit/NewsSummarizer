import React, { useState, useEffect } from 'react';
import './NewsSummarizer.css';
import { X } from 'lucide-react';

const NewsSummarizer = () => {
  const [newTopic, setNewTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [timeframe, setTimeframe] = useState('1h');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [summarizing, setSummarizing] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load saved topics on component mount (if there are saved topics)
  useEffect(() => {
    const savedTopics = localStorage.getItem('newsTopics');
    if (savedTopics) {
      setTopics(JSON.parse(savedTopics));
    }
  }, []);

  // Save topics whenever they change
  useEffect(() => {
    localStorage.setItem('newsTopics', JSON.stringify(topics));
  }, [topics]);

  const addTopic = (e) => {
    e.preventDefault();
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
    }
  };

  const removeTopic = (topicToRemove) => {
    setTopics(topics.filter(topic => topic !== topicToRemove));
  };

  const searchArticles = async () => {
    if (topics.length === 0) {
      setError('Please add at least one topic');
      return;
    }

    setLoading(true);
    setError(null);
    setArticles([]);
    try {
      // Fetch articles for each topic
      const allArticles = await Promise.all(
        topics.map(async (topic) => {
          const response = await fetch(
            `https://gnews.io/api/v4/search?` +
            `q=${encodeURIComponent(topic)}&` +
            `lang=en&` +
            `sortby=publishedAt&` +
            `from=${getTimeframeDate(timeframe)}&` +
            `apikey=${process.env.REACT_APP_GNEWS_API_KEY}`
          );

          if (!response.ok) throw new Error(`Failed to fetch articles for "${topic}"`);
          
          const data = await response.json();
          return data.articles.map(article => ({
            ...article,
            topic,
            id: `${topic}-${article.title}`,
          }));
        })
      );

      // Flatten and deduplicate articles
      const uniqueArticles = Array.from(
        new Map(
          allArticles.flat().map(article => [article.title, article])
        ).values()
      );

      setArticles(uniqueArticles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (articleId) => {
    const article = articles.find(a => a.id === articleId);
    if (!article || article.aiSummary) return;

    setSummarizing(prev => ({ ...prev, [articleId]: true }));

    try {
        console.log('Sending article for summarization', {
            title: article.title,
            content: article.originalDescription
        });
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: article.title,
          content: article.originalDescription
        }),
      });

      const rawResponse = await response.text();
      console.log('Raw API response:', rawResponse);

      // parse it as JSON
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from backend server');
      }
      console.log('Parsed summary response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      setArticles(prevArticles =>
        prevArticles.map(a =>
          a.id === articleId
            ? { ...a, aiSummary: data.summary }
            : a
        )
      );
    } catch (err) {
        console.error('Summary generation error:', err);
        setError(`Failed to generate AI summary: $[err.message}`);
    } finally {
      setSummarizing(prev => ({ ...prev, [articleId]: false }));
    }
  };

  const getTimeframeDate = (tf) => {
    const now = new Date();
    switch (tf) {
      case '1h': now.setHours(now.getHours() - 1); break;
      case '12h': now.setHours(now.getHours() - 12); break;
      case '1d': now.setDate(now.getDate() - 1); break;
      case '7d': now.setDate(now.getDate() - 7); break;
      default: now.setHours(now.getHours() - 1);
    }
    return now.toISOString();
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="news-container">
       {/* Topics Section */}
       <div className="topics-container">
        <h2>Your News Topics</h2>
      {/* Topic Input Form */}
      <form onSubmit={addTopic} className="topic-input-form">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Enter a news topic..."
            className="topic-input"
          />
          <button type="submit" className="add-topic-button">
            Add Topic
          </button>
        </form>

        {/* Topics Display */}
        <div className="topics-list">
          {topics.map(topic => (
            <div key={topic} className="topic-bubble">
              <span>{topic}</span>
              <button
                onClick={() => removeTopic(topic)}
                className="remove-topic-button"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Search Controls */}
        <div className="search-controls">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="timeframe-select"
          >
            <option value="1h">Last hour</option>
            <option value="12h">Last 12h</option>
            <option value="1d">Last 24h</option>
            <option value="7d">Last week</option>
          </select>
          <button 
            onClick={searchArticles}
            disabled={loading || topics.length === 0}
            className="search-button"
          >
            {loading ? 'Searching...' : 'Search Articles'}
          </button>
        </div>
      </div>

      {/* Articles List */}
      {error && <div className="error-message">{error}</div>}
      
      <div className="articles-list">
        {articles.map(article => (
          <div key={article.id} className="article-item">
            <div 
              className="article-title"
              onClick={() => !article.aiSummary && generateSummary(article.id)}
            >
              {article.title}
              <span className="topic-tag">{article.topic}</span>
            </div>
            
            {article.aiSummary && (
              <div className="article-summary">
                {article.aiSummary}
              </div>
            )}
            
            {summarizing[article.id] && (
              <div className="loading-summary">Generating summary...</div>
            )}
            
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="article-link"
            >
              Read full article →
            </a>
          </div>
        ))}
        </div>
    </div>
  );
};

              

export default NewsSummarizer;
import React, { useState } from 'react';
import { Box, Button, CircularProgress, Link, Paper, TextField, Typography, Chip } from '@mui/material';
import { axiosInstance } from '../axois/axiosInstance';

/**
 * "Ask about this stock": sends a question to /api/stocks/:symbol/ask and
 * shows the cited answer from the RAG service.
 */
export default function AskStock({ symbol }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const ask = async (e) => {
    e.preventDefault();
    if (question.trim().length < 3) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await axiosInstance.post(`/api/stocks/${symbol}/ask`, { question: question.trim() });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: '16px', backgroundColor: '#E3F2FD', borderRadius: '12px', marginTop: '20px' }}>
      <Typography variant="h5" fontWeight="bold" marginBottom="10px">
        Ask about this stock
      </Typography>
      <Box component="form" onSubmit={ask} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label={`e.g. What's the latest news risk for ${symbol}?`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          inputProps={{ maxLength: 1000 }}
          sx={{ backgroundColor: '#fff' }}
        />
        <Button type="submit" variant="contained" disabled={loading || question.trim().length < 3}>
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Ask'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ marginTop: 2 }}>
          {error}
        </Typography>
      )}

      {result && (
        <Box sx={{ marginTop: 2 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {result.answer}
          </Typography>
          {result.citations.length > 0 && (
            <Box sx={{ marginTop: 1.5 }}>
              <Typography variant="subtitle2">Sources</Typography>
              {result.citations.map((c) => (
                <Typography variant="body2" key={c.n}>
                  [{c.n}]{' '}
                  <Link href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.title || c.url}
                  </Link>
                  {c.published_at ? ` (${c.published_at.slice(0, 10)})` : ''}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ marginTop: 1, display: 'flex', gap: 1 }}>
            {result.cached && <Chip size="small" label="cached" />}
            <Chip size="small" label={`${Math.round(result.latency_ms)} ms`} />
          </Box>
        </Box>
      )}
    </Paper>
  );
}

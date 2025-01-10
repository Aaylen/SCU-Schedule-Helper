import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Container,
  Divider,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

function checkServiceWorker() {
  console.log('Checking service worker connection...');
  
  chrome.runtime.sendMessage({ type: 'ping' }, response => {
    if (chrome.runtime.lastError) {
      console.error('Service worker connection error:', chrome.runtime.lastError);
      setError('Unable to connect to service worker: ' + chrome.runtime.lastError.message);
      return;
    }
    checkServiceWorker();
    
    console.log('Service worker response:', response);
  });
}

  useEffect(() => {
    console.log('ChatInterface mounted');
    // Load existing thread ID if any
    chrome.storage.local.get('chatThreadId', (result) => {
      console.log('Retrieved threadId from storage:', result.chatThreadId);
      if (result.chatThreadId) {
        setThreadId(result.chatThreadId);
      }
    });
  }, []);

  useEffect(() => {
    console.log('ChatInterface mounted');
    // Load existing thread ID if any
    chrome.storage.local.get('chatThreadId', (result) => {
      console.log('Retrieved threadId from storage:', result.chatThreadId);
      if (result.chatThreadId) {
        setThreadId(result.chatThreadId);
      }
    });
  }, []);

  // Rest of the component remains the same...
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log('Messages updated:', messages.length);
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage = input.trim();
  console.log('Sending message:', userMessage);
  console.log('Current threadId:', threadId);
  
  setIsLoading(true);
  setMessages(prev => [...prev, {
    role: 'user',
    content: userMessage,
    timestamp: new Date()
  }]);
  setInput('');

  try {
    console.log('Sending message to service worker:', {
      type: 'chatMessage',
      message: userMessage,
      threadId: threadId
    });
    
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'chatMessage',
        message: userMessage,
        threadId: threadId
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('Message send error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        console.log('Received response from SW:', response);
        resolve(response);
      });
    });

    if (response.error) {
      throw new Error(response.error);
    }

    setThreadId(response.threadId);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.message,
      timestamp: new Date()
    }]);
  } catch (error) {
    console.error('Chat Error:', error);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Sorry, there was an error processing your message: ' + error.message,
      timestamp: new Date()
    }]);
  } finally {
    setIsLoading(false);
  }
};

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    console.log('Clearing chat history');
    setMessages([]);
    setThreadId(null);
    chrome.storage.local.remove('chatThreadId', () => {
      console.log('ChatThreadId removed from storage');
    });
  };

  return (
    <Container maxWidth="sm" disableGutters>
      <Paper 
        elevation={3} 
        sx={{ 
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            Chat Assistant
          </Typography>
          <IconButton 
            onClick={clearChat}
            color="inherit"
            size="small"
            title="Clear chat"
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Error message */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Messages Area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography variant="body1">
                  {message.content}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    mt: 0.5,
                    opacity: 0.8
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          ))}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              sx={{ alignSelf: 'flex-end' }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatInterface;
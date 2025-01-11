import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Container,
  Divider,
  Alert,
  Tooltip
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I am a chatbot capable of referencing the SCU bulletin. How may I assist you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log("Messages updated:", messages.length);
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    console.log("Sending message:", userMessage);

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);
    setInput("");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "chatMessage",
        message: userMessage,
        threadId: undefined,
      });

      if (response.error) {
        if (response.statusCode === 401) {
          setError("Your session has expired. Please log in again.");
          return;
        }
        throw new Error(response.error);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, there was an error processing your message: " +
            error.message,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    console.log("Clearing chat history");
    setMessages([]);
    setError(null);
  };

  return (
    <Container maxWidth="sm" disableGutters>
      <Paper
        elevation={3}
        sx={{
          height: "400px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(112, 51, 49, 0.2)",
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "#703331",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Chat Assistant
          </Typography>
          <Tooltip title="Clear chat" arrow placement="left">
            <IconButton
              onClick={clearChat}
              color="inherit"
              size="small"
              sx={{ 
                '&:hover': { 
                  bgcolor: 'rgba(255, 255, 255, 0.1)' 
                } 
              }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ 
              borderRadius: 0,
              '& .MuiAlert-icon': {
                color: '#703331'
              }
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            p: 2,
            bgcolor: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  bgcolor: message.role === "user" ? "#703331" : "white",
                  color: message.role === "user" ? "white" : "#2c2c2c",
                  borderRadius: 2,
                  boxShadow: message.role === "user" 
                    ? "0 2px 4px rgba(112, 51, 49, 0.2)"
                    : "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {message.content}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    opacity: 0.8,
                    fontSize: "0.75rem",
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          ))}
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress 
                size={24} 
                sx={{ 
                  color: '#703331'
                }}
              />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        <Box 
          sx={{ 
            p: 2, 
            bgcolor: "white",
            borderTop: "1px solid rgba(112, 51, 49, 0.1)" 
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
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
              sx={{
                bgcolor: "white",
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#703331',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(112, 51, 49, 0.5)',
                  },
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              sx={{ 
                alignSelf: "flex-end",
                color: '#703331',
                '&:hover': {
                  bgcolor: 'rgba(112, 51, 49, 0.1)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(112, 51, 49, 0.3)',
                }
              }}
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

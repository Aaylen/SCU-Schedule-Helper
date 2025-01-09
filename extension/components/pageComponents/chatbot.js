import { useState, useEffect } from "react";
import { Alert, Box, Snackbar } from "@mui/material";
import AuthWrapper from "./authWrapper";
import ChatInterface from "../chatComponents/chatInterface";

export default function ChatBot() {


  return (
    <AuthWrapper>
      <Box
        sx={{
          overflow: "auto",
          padding: 2,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ChatInterface />
      </Box>
    </AuthWrapper>
  );
}
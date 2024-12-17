import { useState, useEffect } from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";

const AuthWrapper = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    const authListener = (changes, namespace) => {
      if (changes.accessToken) {
        checkAuthStatus();
      }
    };
    chrome.storage.onChanged.addListener(authListener);
    return () => {
      chrome.storage.onChanged.removeListener(authListener);
    };
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      const accessToken = (await chrome.storage.sync.get("accessToken"))
        .accessToken;
      setIsLoggedIn(accessToken);
    } catch (error) {
      console.error("Error checking auth status:", error);
      onError(
        "An unknown error occurred while checking authentication status.",
      );
    }
    setIsCheckingAuth(false);
  };

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const errorMessage = await chrome.runtime.sendMessage("signIn");
      if (errorMessage) onError(errorMessage);
    } catch (error) {
      console.error("Unknown auth error:", error);
      onError("Unknown error occurred while signing in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onError = (message) => {
    setError(message);
    setShowActionCompletedMessage(true);
  };

  if (isCheckingAuth) {
    return <></>;
  }
  // If not logged in, show sign-in prompt
  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body1" sx={{ mb: 3 }}>
          You must be signed in to access this feature.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSignIn}
          disabled={isLoggingIn}
          sx={{
            backgroundColor: "#802a25",
            color: "white",
            "&:hover": {
              backgroundColor: "#671f1a",
            },
          }}
        >
          {isLoggingIn ? "Logging in..." : "Sign In with Google"}
        </Button>
        <Snackbar
          open={showActionCompletedMessage}
          autoHideDuration={5000}
          onClose={() => setShowActionCompletedMessage(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowActionCompletedMessage(false)}
            severity={"error"}
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;

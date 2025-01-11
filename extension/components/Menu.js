import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import {
  Home,
  AccountCircle,
  Search,
  Tune,
  PersonAdd,
  Close,
  Chat,
} from "@mui/icons-material";

export const supportEmail = "swdean@scu.edu";

export default function Menu({ navigateToPage, openLandingPage }) {
  const [activeMenu, setActiveMenu] = useState("main");
  const [friendNotificationCount, setFriendNotificationCount] = useState(0);

  useEffect(() => {
    async function updateFriendNotificationCount() {
      try {
        const { friendRequestsIn } = await chrome.storage.local.get("friendRequestsIn");
        if (!friendRequestsIn) return;
        setFriendNotificationCount(Object.values(friendRequestsIn).length);
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    }

    updateFriendNotificationCount();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.friendRequestsIn) {
        updateFriendNotificationCount();
      }
    });
  }, []);

  const menuItems = [
    { 
      icon: <Home />, 
      id: "home", 
      label: "SCU Helper",
      action: () => openLandingPage() 
    },
    { 
      icon: <Search />, 
      id: "main", 
      action: () => navigateToPage("main") 
    },
    {
      icon: <Tune />,
      id: "preferences",
      action: () => navigateToPage("preferences"),
    },
    {
      icon: <Chat />,
      id: "chat",
      action: () => navigateToPage("chat"),
    },
    {
      icon: <PersonAdd />,
      id: "friends",
      action: () => navigateToPage("friends"),
    },
    {
      icon: <AccountCircle />,
      id: "profile",
      action: () => navigateToPage("profile"),
    },
    {
      icon: <Close />,
      id: "close",
      action: () => window.close(),
    },
  ];

  useEffect(() => {
    setActiveMenu("main");
  }, []);

  return (
    <Box sx={{ mb: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "white",
          boxShadow: "none",
          borderBottom: "2px solid #d1d1d1",
        }}
      >
        <Toolbar>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              gap: "8px",
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.id}
                sx={{
                  minWidth: item.label ? "80px" : "40px",
                  padding: "4px",
                  position: "relative",
                  color: "black",
                  display: "flex",
                  alignItems: "center",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                    "& .menu-icon": {
                      color: "#703331",
                    },
                  },
                  "&:hover::after, &.active::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: "2px",
                    width: 0,
                    backgroundColor: "transparent",
                    transition: "background-color 0.3s, width 0.3s",
                  },
                }}
                onClick={() => {
                  setActiveMenu(item.id);
                  item.action();
                }}
                className={activeMenu === item.id ? "active" : ""}
              >
                {item.id === "friends" ? (
                  <Badge
                    badgeContent={friendNotificationCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: 10,
                        height: 15,
                        minWidth: 15,
                        backgroundColor: "firebrick",
                        color: "white",
                      },
                    }}
                  >
                    {React.cloneElement(item.icon, {
                      className: "menu-icon",
                      sx: {
                        fontSize: 24,
                        color: activeMenu === item.id ? "#703331" : "#d1d1d1",
                        transition: "color 0.3s",
                      },
                    })}
                  </Badge>
                ) : (
                  <>
                    {React.cloneElement(item.icon, {
                      className: "menu-icon",
                      sx: {
                        fontSize: 24,
                        color: activeMenu === item.id ? "#703331" : "#d1d1d1",
                        transition: "color 0.3s",
                      },
                    })}
                    {item.label && (
                      <Box
                        sx={{
                          ml: 0.5,
                          color: activeMenu === item.id ? "#703331" : "black",
                          fontWeight: "bold",
                          fontSize: "0.7rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </Box>
                    )}
                  </>
                )}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

import * as React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import ProfCourseSearch from '../ProfCourseSearch'; 

export default function Main({ navigateToPage }) {
  return (
    <Box sx={{ overflow: "auto"}}>
      <Box
        sx={{
          mb: 3,
          flexDirection: "column",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography sx={{ mb: 3 }}>
          Search Professor and Course Information:
        </Typography>
        
        <Box sx={{ width: "100%", maxWidth: "420px" }}>
          <ProfCourseSearch />
        </Box>
      </Box>
    </Box>
  );
}
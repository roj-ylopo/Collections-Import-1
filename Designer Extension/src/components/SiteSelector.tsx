import React, { useEffect } from "react";
import {
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Paper,
} from "@mui/material";
import { SiteInfo } from "../types/index";

interface SiteSelectorProps {
  sites: SiteInfo[];
  onSelect: (site: SiteInfo) => void;
}

const SiteSelector: React.FC<SiteSelectorProps> = ({ sites, onSelect }) => {
  return (
    <Paper sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
        Select a Site
      </Typography>
      <List disablePadding>
        {sites.map((site) => (
          <ListItemButton
            key={site.id}
            onClick={() => onSelect(site)}
            divider
          >
            <ListItemText
              primary={site.displayName}
              secondary={site.shortName}
              primaryTypographyProps={{ fontSize: "0.85rem" }}
              secondaryTypographyProps={{ fontSize: "0.75rem" }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};

export default SiteSelector;

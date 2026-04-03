import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { WFCollection, ImportType } from "../types/index";

interface CollectionMapperProps {
  type: ImportType;
  existingCollection: WFCollection | null;
}

const CollectionMapper: React.FC<CollectionMapperProps> = ({
  type,
  existingCollection,
}) => {
  const collectionName =
    type === "team" ? "Team" : type === "communities" ? "Communities" : "Testimonials";

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Target Collection
      </Typography>
      {existingCollection ? (
        <Chip
          icon={<CheckCircleOutlineIcon />}
          label={`Collection found: "${existingCollection.displayName}"`}
          color="success"
          size="small"
          variant="outlined"
        />
      ) : (
        <Chip
          icon={<AddCircleOutlineIcon />}
          label={`"${collectionName}" will be created`}
          color="warning"
          size="small"
          variant="outlined"
        />
      )}
    </Box>
  );
};

export default CollectionMapper;

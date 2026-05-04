import { Avatar } from "@mui/material";
import { decodeDisplayText } from "./displayText";

export default function UserAvatar({ user, size = 44 }) {
  const label = decodeDisplayText(user?.displayName || user?.username || "?");

  return (
    <Avatar
      src={user?.avatarUrl || ""}
      alt={label}
      sx={{
        width: size,
        height: size,
        bgcolor: "secondary.main",
        color: "background.default",
        fontWeight: 800,
      }}
    >
      {label.charAt(0).toUpperCase()}
    </Avatar>
  );
}

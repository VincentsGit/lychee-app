import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import UserAvatar from "../components/UserAvatar";
import { api } from "../components/api";
import { decodeDisplayText } from "../components/displayText";

function postPath(comment) {
  const title = decodeDisplayText(comment.post.title).replace(/\s+/g, "-").toLowerCase();
  return `/blog/${comment.post.id}/${encodeURIComponent(title)}`;
}

export default function User() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  useEffect(() => {
    api(`/api/users/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [userId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return null;
  const avalonStats = profile.avalonStats || {};
  const avalonHistory = profile.avalonHistory || [];

  return (
    <Stack spacing={3}>
      <AnimatedSection>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
            <UserAvatar user={profile} size={116} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h1" color="blog.subheading">{decodeDisplayText(profile.displayName)}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip label={`@${profile.username}`} />
                <Chip label={`Joined ${new Date(profile.createdAt).toLocaleDateString()}`} variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="h2" color="blog.subheading">Avalon</Typography>
                <Typography color="text.secondary">
                  {avalonStats.gamesPlayed || 0} games · {avalonStats.winRate || 0}% win rate
                </Typography>
              </Box>
              <Typography variant="h1" color="secondary.main" sx={{ lineHeight: 1 }}>
                {avalonStats.mmr || 1000}
              </Typography>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
              {[
                ["Won", avalonStats.gamesWon || 0],
                ["Lost", avalonStats.gamesLost || 0],
                ["Good", avalonStats.gamesAsGood || 0],
                ["Evil", avalonStats.gamesAsEvil || 0],
                ["Merlin", avalonStats.gamesAsMerlin || 0],
                ["Merlin wins", avalonStats.merlinGamesWon || 0],
                ["Assassin", avalonStats.gamesAsAssassin || 0],
                ["Killed Merlin", avalonStats.killedMerlin || 0],
              ].map(([label, value]) => (
                <Paper key={label} variant="outlined" sx={{ p: 1.5, boxShadow: "none" }}>
                  <Typography variant="h3">{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Paper>
              ))}
            </Box>

            <Divider />

            <Box>
              <Typography variant="h3" color="blog.subheading">Match history</Typography>
              {avalonHistory.length ? (
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {avalonHistory.map((match) => {
                    const expanded = expandedMatchId === match.gameId;
                    return (
                      <Paper key={match.gameId} variant="outlined" sx={{ p: 1.5, boxShadow: "none" }}>
                        <Stack spacing={1}>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                label={match.result === "victory" ? "Victory" : "Defeat"}
                                color={match.result === "victory" ? "success" : "error"}
                              />
                              <Chip label={match.role} variant="outlined" />
                              <Chip label={`${match.mmrAfter - match.mmrBefore >= 0 ? "+" : ""}${match.mmrAfter - match.mmrBefore} MMR`} variant="outlined" />
                            </Stack>
                            <Button size="small" variant="text" onClick={() => setExpandedMatchId(expanded ? null : match.gameId)}>
                              {expanded ? "Hide" : "Details"}
                            </Button>
                          </Stack>
                          {expanded && (
                            <Stack spacing={0.75}>
                              <Typography variant="caption" color="text.secondary">
                                Duration {Math.floor((match.durationSeconds || 0) / 60).toString().padStart(2, "0")}:{Math.floor((match.durationSeconds || 0) % 60).toString().padStart(2, "0")}
                              </Typography>
                              {(match.events || []).map((event) => (
                                <Typography key={event.id} variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                  {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {event.message}
                                </Typography>
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 1 }}>No Avalon games yet.</Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h2" color="blog.subheading">Comments</Typography>
              <Typography color="text.secondary">
                {(profile.comments || []).length} {(profile.comments || []).length === 1 ? "comment" : "comments"} from this user
              </Typography>
            </Box>

            {(profile.comments || []).length ? (
              <Stack divider={<Divider flexItem />} spacing={2.5}>
                {profile.comments.map((comment) => (
                  <Box key={comment.id}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "baseline" }} justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {comment.replyingTo ? `Replying to @${comment.replyingTo.username}` : "Comment"} · {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                      <Button component={RouterLink} to={postPath(comment)} variant="text" size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                        View post
                      </Button>
                    </Stack>
                    <Typography sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{decodeDisplayText(comment.content)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      On {decodeDisplayText(comment.post.title)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No comments yet.</Typography>
            )}
          </Stack>
        </Paper>
      </AnimatedSection>
    </Stack>
  );
}

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

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatEventTime(eventTime, startedAt) {
  const eventDate = new Date(eventTime);
  const startDate = new Date(startedAt);
  if (Number.isNaN(eventDate.getTime()) || Number.isNaN(startDate.getTime())) return "00:00";
  const elapsedMs = Math.max(0, eventDate.getTime() - startDate.getTime());
  return formatDuration(Math.floor(elapsedMs / 1000));
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
  const matchesPerPage = 10;
  const totalMatches = avalonHistory.length;
  const totalMatchPages = Math.max(1, Math.ceil(totalMatches / matchesPerPage));
  const matchPage = Math.min(Math.max(1, expandedMatchId?.page || 1), totalMatchPages);
  const visibleMatches = avalonHistory.slice((matchPage - 1) * matchesPerPage, matchPage * matchesPerPage);
  const expandedGameId = expandedMatchId?.gameId || null;

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
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                    <Typography color="text.secondary">
                      Showing {visibleMatches.length} games of {totalMatches} · page {matchPage} of {totalMatchPages}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={matchPage <= 1}
                        onClick={() => setExpandedMatchId({ page: matchPage - 1, gameId: null })}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={matchPage >= totalMatchPages}
                        onClick={() => setExpandedMatchId({ page: matchPage + 1, gameId: null })}
                      >
                        Next
                      </Button>
                    </Stack>
                  </Stack>
                  {visibleMatches.map((match) => {
                    const expanded = expandedGameId === match.gameId;
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
                            <Button size="small" variant="text" onClick={() => setExpandedMatchId({ page: matchPage, gameId: expanded ? null : match.gameId })}>
                              {expanded ? "Hide" : "Details"}
                            </Button>
                          </Stack>
                          {expanded && (
                            <Stack spacing={1.25}>
                              <Typography variant="caption" color="text.secondary">
                                Duration {formatDuration(match.durationSeconds || 0)}
                              </Typography>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>Players</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {(match.players || []).map((player) => (
                                    <Chip
                                      key={player.user.id}
                                      component={RouterLink}
                                      to={`/users/${player.user.id}`}
                                      clickable
                                      label={`${decodeDisplayText(player.user.displayName)} · ${player.role}`}
                                      color={player.team === "good" ? "info" : "error"}
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              </Box>
                              {(match.events || []).map((event) => (
                                <Typography key={event.id} variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                  {formatEventTime(event.createdAt, match.startedAt)} · {event.message}
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

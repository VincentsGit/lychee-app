import { useEffect, useMemo, useState } from "react";
import CasinoIcon from "@mui/icons-material/Casino";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AnimatedSection from "../components/AnimatedSection";
import { api } from "../components/api";
import AvalonOffline from "./AvalonOffline";

const avalonApi = (path) => `/api${path}`;

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const userName = (user) => user?.displayName || user?.username || "Unknown";

function QuestBoard({ game }) {
  const quests = game?.quests || [];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5, minmax(0, 1fr))" }, gap: 1.5 }}>
      {quests.map((quest) => {
        const current = quest.questIndex === game.currentQuestIndex && game.status === "in_progress";
        return (
          <Paper
            key={quest.id}
            variant="outlined"
            sx={{
              p: 1.5,
              textAlign: "center",
              boxShadow: "none",
              borderColor: quest.result === "success" ? "info.main" : quest.result === "fail" ? "error.main" : current ? "secondary.main" : "divider",
              bgcolor: quest.result === "success" ? "rgba(63, 193, 201, 0.10)" : quest.result === "fail" ? "rgba(239, 98, 108, 0.10)" : "transparent",
            }}
          >
            <Typography variant="h3">Quest {quest.questIndex + 1}</Typography>
            <Typography color="text.secondary">{quest.teamSize} players</Typography>
            {quest.failThreshold > 1 && <Chip size="small" color="warning" variant="outlined" label="2 fails to fail" sx={{ mt: 1 }} />}
            <Chip
              size="small"
              label={quest.result ? (quest.result === "success" ? "Passed" : "Failed") : current ? "Current" : "Waiting"}
              color={quest.result === "success" ? "info" : quest.result === "fail" ? "error" : current ? "secondary" : "default"}
              sx={{ mt: 1 }}
            />
          </Paper>
        );
      })}
    </Box>
  );
}

function OnlineGame({ game, setGame, refreshGame, setError }) {
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [busy, setBusy] = useState(false);
  const viewer = game.viewer || {};
  const currentQuest = game.currentQuest;
  const realCurrentUserId = viewer.userId;
  const isLeader = viewer.isLeader;
  const selectedIds = currentQuest?.selectedTeam || selectedTeam;
  const selectedPlayers = game.players.filter((player) => selectedIds.includes(player.user.id));
  const myVote = currentQuest?.votes?.find((vote) => vote.userId === realCurrentUserId);
  const myCard = currentQuest?.questCards?.find((card) => card.userId === realCurrentUserId);
  const onQuest = selectedIds.includes(realCurrentUserId);
  const goodTargets = game.assassinTargets || [];
  const successes = game.quests.filter((quest) => quest.result === "success").length;
  const fails = game.quests.filter((quest) => quest.result === "fail").length;

  useEffect(() => {
    setSelectedTeam(currentQuest?.selectedTeam || []);
  }, [currentQuest?.id, currentQuest?.selectedTeam?.join(",")]);

  const postAction = async (path, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const data = await api(avalonApi(path), { method: "POST", body: JSON.stringify(body) });
      if (!data?.game) throw new Error("The game response was empty. Please try again.");
      setGame(data.game);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleTeam = (userId) => {
    if (!currentQuest) return;
    setSelectedTeam((current) => {
      if (current.includes(userId)) return current.filter((id) => id !== userId);
      if (current.length >= currentQuest.teamSize) return current;
      return [...current, userId];
    });
  };

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, overflow: "hidden" }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="h2" color="blog.subheading">Online game</Typography>
              <Typography color="text.secondary">Timer {formatDuration(game.durationSeconds)} · expires after 24 hours</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Good ${successes}/3`} color="info" variant="outlined" />
              <Chip label={`Evil ${fails}/3`} color="error" variant="outlined" />
              <Chip label={`Rejects ${game.rejectedVotes}/5`} color="warning" variant="outlined" />
              <Button size="small" startIcon={<RefreshIcon />} onClick={refreshGame}>Refresh</Button>
            </Stack>
          </Stack>

          <QuestBoard game={game} />

          {game.status !== "in_progress" && (
            <Alert severity={game.winner === "good" ? "info" : game.winner === "evil" ? "error" : "warning"}>
              {game.status === "expired" ? "This game expired." : `${game.winner === "good" ? "Good" : "Evil"} wins.`}
            </Alert>
          )}

          {game.currentPhase === "roles" && game.status === "in_progress" && (
            <Paper variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
              <Stack spacing={1.5}>
                <Typography variant="h3" color="blog.subheading">Your role</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={viewer.team === "good" ? "Servants of Arthur" : "Minions of Mordred"} color={viewer.team === "good" ? "info" : "error"} />
                  <Chip label={viewer.role} variant="outlined" />
                </Stack>
                <Button variant="contained" disabled={busy || viewer.continuedAfterRole} onClick={() => postAction(`/avalon/games/${game.id}/continue`)}>
                  {viewer.continuedAfterRole ? "Waiting for everyone else" : "Continue"}
                </Button>
              </Stack>
            </Paper>
          )}

          {game.currentPhase === "team_selection" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h3" color="blog.subheading">Team selection</Typography>
                <Typography color="text.secondary">
                  {isLeader ? `Choose ${currentQuest.teamSize} players for Quest ${currentQuest.questIndex + 1}.` : `Waiting for the leader to choose ${currentQuest.teamSize} players.`}
                </Typography>
                {currentQuest.failThreshold > 1 && <Alert severity="warning" sx={{ mt: 1 }}>This quest needs two Fail cards to fail.</Alert>}
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                {game.players.map((player) => {
                  const selected = selectedTeam.includes(player.user.id);
                  return (
                    <Button
                      key={player.user.id}
                      variant={selected ? "contained" : "outlined"}
                      disabled={!isLeader || (!selected && selectedTeam.length >= currentQuest.teamSize)}
                      onClick={() => toggleTeam(player.user.id)}
                      sx={{ justifyContent: "flex-start", overflowWrap: "anywhere" }}
                    >
                      {userName(player.user)}
                    </Button>
                  );
                })}
              </Box>
              {isLeader && (
                <Button
                  variant="contained"
                  disabled={busy || selectedTeam.length !== currentQuest.teamSize}
                  onClick={() => postAction(`/avalon/games/${game.id}/team`, { selectedTeam })}
                >
                  Submit team
                </Button>
              )}
            </Stack>
          )}

          {game.currentPhase === "voting" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Typography variant="h3" color="blog.subheading">Vote on the team</Typography>
              <Typography color="text.secondary">
                {selectedPlayers.map((player) => userName(player.user)).join(", ")} · {currentQuest.votes.length}/{game.playerCount} votes in
              </Typography>
              {myVote ? (
                <Alert severity="info">You voted {myVote.vote}. Waiting for the rest of the table.</Alert>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" color="info" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/vote`, { vote: "approve" })}>Approve</Button>
                  <Button variant="contained" color="error" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/vote`, { vote: "reject" })}>Reject</Button>
                </Stack>
              )}
            </Stack>
          )}

          {game.currentPhase === "quest_cards" && game.status === "in_progress" && currentQuest && (
            <Stack spacing={1.5}>
              <Typography variant="h3" color="blog.subheading">Quest cards</Typography>
              <Typography color="text.secondary">{currentQuest.questCards.length}/{currentQuest.teamSize} quest cards submitted.</Typography>
              {currentQuest.failThreshold > 1 && <Alert severity="warning">This quest only fails if two or more Fail cards are played.</Alert>}
              {!onQuest ? (
                <Alert severity="info">You are not on this quest. Waiting for the selected players.</Alert>
              ) : myCard ? (
                <Alert severity="info">Your quest card is in. Waiting for the others.</Alert>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" color="info" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/quest-card`, { card: "success" })}>Success</Button>
                  {viewer.team === "evil" && (
                    <Button variant="contained" color="error" disabled={busy} onClick={() => postAction(`/avalon/games/${game.id}/quest-card`, { card: "fail" })}>Fail</Button>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {game.currentPhase === "assassin" && game.status === "in_progress" && (
            <Stack spacing={1.5}>
              <Alert severity="warning">Good completed three quests. The Assassin picks Merlin.</Alert>
              {viewer.role === "Assassin" ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                  {goodTargets.map((player) => (
                    <Button key={player.id} variant="outlined" color="error" onClick={() => postAction(`/avalon/games/${game.id}/assassin-pick`, { targetUserId: player.id })}>
                      {userName(player)}
                    </Button>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">Waiting for the Assassin.</Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h2" color="blog.subheading">Timeline</Typography>
          {(game.events || []).map((event) => (
            <Typography key={event.id} color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {event.message}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function OnlineAvalon({ user }) {
  const [lobbies, setLobbies] = useState([]);
  const [lobby, setLobby] = useState(null);
  const [game, setGame] = useState(null);
  const [name, setName] = useState("Avalon lobby");
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");

  const refreshLobbies = async () => {
    const data = await api(avalonApi("/avalon/lobbies"));
    setLobbies(Array.isArray(data?.lobbies) ? data.lobbies : []);
  };

  const refreshGame = async () => {
    if (!game?.id) return;
    const data = await api(avalonApi(`/avalon/games/${game.id}`));
    if (!data?.game) throw new Error("The game response was empty. Please try again.");
    setGame(data.game);
  };

  const refreshLobby = async () => {
    if (!lobby?.id) return;
    const data = await api(avalonApi(`/avalon/lobbies/${lobby.id}`));
    if (!data?.lobby) throw new Error("The lobby response was empty. Please try again.");
    setLobby(data.lobby);
    if (data.lobby?.gameId && !game) {
      const gameData = await api(avalonApi(`/avalon/games/${data.lobby.gameId}`));
      if (!gameData?.game) throw new Error("The game response was empty. Please try again.");
      setGame(gameData.game);
    }
  };

  useEffect(() => {
    refreshLobbies().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (game?.id) refreshGame().catch(() => {});
      else if (lobby?.id) refreshLobby().catch(() => {});
      else refreshLobbies().catch(() => {});
    }, 2000);
    return () => window.clearInterval(timer);
  }, [game?.id, lobby?.id]);

  const post = async (path, body = {}) => {
    setError("");
    try {
      const data = await api(avalonApi(path), { method: "POST", body: JSON.stringify(body) });
      if (data.game) setGame(data.game);
      if (data.lobby) setLobby(data.lobby);
      if (!data?.game && !data?.lobby) throw new Error("The Avalon response was empty. Please try again.");
      await refreshLobbies();
    } catch (err) {
      setError(err.message);
    }
  };

  const joinedLobby = lobby?.players?.some((player) => player.id === user?.id);
  const readyPlayer = lobby?.players?.find((player) => player.id === user?.id);
  const canStart = lobby && lobby.hostUserId === user?.id && lobby.players.length >= 5 && lobby.players.every((player) => player.ready);

  if (game) {
    return <OnlineGame game={game} setGame={setGame} refreshGame={refreshGame} setError={setError} />;
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={2}>
          <Typography variant="h2" color="blog.subheading">Create lobby</Typography>
          <TextField label="Lobby name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="Optional password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          <Button variant="contained" startIcon={<GroupsIcon />} onClick={() => post("/avalon/lobbies", { name, password })}>Create online lobby</Button>
        </Stack>
      </Paper>

      {lobby && (
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography variant="h2" color="blog.subheading">{lobby.name}</Typography>
                <Typography color="text.secondary">{lobby.players.length}/10 players · {lobby.status}</Typography>
              </Box>
              <Button startIcon={<RefreshIcon />} onClick={refreshLobby}>Refresh</Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
              {lobby.players.map((player) => (
                <Chip key={player.id} label={`${userName(player)}${player.ready ? " · ready" : ""}`} color={player.ready ? "info" : "default"} variant={player.id === lobby.hostUserId ? "filled" : "outlined"} />
              ))}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {joinedLobby && (
                <Button variant="outlined" onClick={() => post(`/avalon/lobbies/${lobby.id}/ready`, { ready: !readyPlayer?.ready })}>
                  {readyPlayer?.ready ? "Mark not ready" : "Ready"}
                </Button>
              )}
              {canStart && <Button variant="contained" startIcon={<CasinoIcon />} onClick={() => post(`/avalon/lobbies/${lobby.id}/start`)}>Start game</Button>}
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h2" color="blog.subheading">Active lobbies</Typography>
            <Button startIcon={<RefreshIcon />} onClick={refreshLobbies}>Refresh</Button>
          </Stack>
          <Stack spacing={1.5}>
            {lobbies.length ? lobbies.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, boxShadow: "none" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Box>
                    <Typography variant="h3" color="blog.subheading" sx={{ overflowWrap: "anywhere" }}>{item.name}</Typography>
                    <Typography color="text.secondary">
                      Hosted by {userName(item.host)} · {item.playerCount}/{item.maxPlayers} players · {item.status}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    {item.hasPassword && <TextField size="small" label="Password" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} type="password" />}
                    <Button
                      variant="outlined"
                      startIcon={item.hasPassword ? <LockIcon /> : null}
                      onClick={() => item.gameId ? api(avalonApi(`/avalon/games/${item.gameId}`)).then((data) => setGame(data.game)).catch((err) => setError(err.message)) : post(`/avalon/lobbies/${item.id}/join`, { password: joinPassword })}
                    >
                      {item.gameId ? "Open game" : "Join"}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )) : (
              <Typography color="text.secondary">No active online lobbies yet.</Typography>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function Avalon({ user }) {
  const [mode, setMode] = useState("offline");
  const loggedIn = Boolean(user?.id);

  const modeCopy = useMemo(() => ({
    offline: "One-phone role reveals and quest tracking.",
    online: "Own-phone roles, votes, quest cards, stats, and history.",
  }), []);

  return (
    <Stack spacing={4} sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", boxSizing: "border-box" }}>
      <AnimatedSection sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <Stack spacing={2} sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <Box sx={{ width: "100%", maxWidth: { xs: "calc(100vw - 64px)", sm: 760 }, minWidth: 0 }}>
            <Typography variant="h1" color="blog.subheading" sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>Avalon</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>
              Play Avalon offline or online.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant={mode === "offline" ? "contained" : "outlined"} startIcon={<RestartAltIcon />} onClick={() => setMode("offline")}>
              Offline
            </Button>
            <Button variant={mode === "online" ? "contained" : "outlined"} startIcon={<GroupsIcon />} disabled={!loggedIn} onClick={() => setMode("online")}>
              Online
            </Button>
          </Stack>
          <Alert severity={mode === "online" ? "info" : "success"} sx={{ maxWidth: { xs: "calc(100vw - 64px)", sm: "100%" }, overflow: "hidden" }}>
            {modeCopy[mode]}
          </Alert>
          {!loggedIn && (
            <Alert severity="warning" sx={{ maxWidth: { xs: "calc(100vw - 64px)", sm: "100%" }, overflow: "hidden" }}>
              Log in to play Avalon online.
            </Alert>
          )}
        </Stack>
      </AnimatedSection>

      <Divider />

      {mode === "online" && loggedIn ? <OnlineAvalon user={user} /> : <AvalonOffline />}
    </Stack>
  );
}
